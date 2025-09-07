const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database('terminal_history.db');

// Create simplified table - one record per terminal with complete buffer
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS terminal_buffers (
        terminal_id TEXT PRIMARY KEY,
        buffer_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
    )`);
    
    // Clean up old terminal history (older than 7 days)
    db.run(`DELETE FROM terminal_buffers WHERE status = 'killed' AND last_activity < datetime('now', '-7 days')`);
    
    console.log('Database initialized and old data cleaned up');
});

const terminals = {};
const orphanedTerminals = new Set();
const MAX_HISTORY_SIZE = 50000; // Max characters of history per terminal (50KB)
let terminalCounter = 0;

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send existing orphaned terminals to new client
    db.all(`SELECT terminal_id FROM terminal_buffers WHERE status = 'orphaned'`, (err, rows) => {
        if (!err && rows.length > 0) {
            const orphanedIds = rows.map(row => row.terminal_id);
            orphanedIds.forEach(id => orphanedTerminals.add(id));
            socket.emit('existing-terminals', orphanedIds);
        }
    });

    socket.on('create-terminal', () => {
        terminalCounter++;
        const terminalId = `term_${terminalCounter}`;
        
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        const term = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: process.env
        });

        terminals[terminalId] = {
            process: term,
            socket: socket.id,
            buffer: '' // In-memory buffer for efficiency
        };

        // Insert terminal into database
        db.run(`INSERT OR REPLACE INTO terminal_buffers (terminal_id, buffer_data, status) VALUES (?, '', 'active')`, [terminalId]);

        term.on('data', (data) => {
            // Update in-memory buffer
            terminals[terminalId].buffer += data;
            
            // Trim buffer if it exceeds max size
            if (terminals[terminalId].buffer.length > MAX_HISTORY_SIZE) {
                terminals[terminalId].buffer = terminals[terminalId].buffer.slice(-MAX_HISTORY_SIZE);
            }
            
            // Update database with complete buffer (replace, not append)
            db.run(`UPDATE terminal_buffers SET buffer_data = ?, last_activity = CURRENT_TIMESTAMP WHERE terminal_id = ?`, 
                   [terminals[terminalId].buffer, terminalId]);

            // Send data to client if connected
            if (terminals[terminalId].socket) {
                io.to(terminals[terminalId].socket).emit('terminal-output', { terminalId, data });
            }
        });

        term.on('exit', () => {
            delete terminals[terminalId];
            orphanedTerminals.delete(terminalId);
            
            // Mark terminal as exited in database (but keep history)
            db.run(`UPDATE terminal_buffers SET status = 'exited' WHERE terminal_id = ?`, [terminalId]);
            
            socket.emit('terminal-closed', { terminalId });
        });

        socket.emit('terminal-created', { terminalId });
        console.log(`Created terminal: ${terminalId}`);
    });

    socket.on('terminal-input', ({ terminalId, data }) => {
        if (terminals[terminalId] && (terminals[terminalId].socket === socket.id || terminals[terminalId].socket === null)) {
            terminals[terminalId].process.write(data);
            // If terminal was orphaned, adopt it
            if (terminals[terminalId].socket === null) {
                terminals[terminalId].socket = socket.id;
                orphanedTerminals.delete(terminalId);
            }
        }
    });

    socket.on('resize-terminal', ({ terminalId, cols, rows }) => {
        if (terminals[terminalId] && (terminals[terminalId].socket === socket.id || terminals[terminalId].socket === null)) {
            terminals[terminalId].process.resize(cols, rows);
            // If terminal was orphaned, adopt it
            if (terminals[terminalId].socket === null) {
                terminals[terminalId].socket = socket.id;
                orphanedTerminals.delete(terminalId);
            }
        }
    });

    socket.on('kill-terminal', ({ terminalId }) => {
        if (terminals[terminalId] && (terminals[terminalId].socket === socket.id || terminals[terminalId].socket === null)) {
            terminals[terminalId].process.kill();
            delete terminals[terminalId];
            orphanedTerminals.delete(terminalId);
            
            // Mark as killed but keep history for a while
            db.run(`UPDATE terminal_buffers SET status = 'killed' WHERE terminal_id = ?`, [terminalId]);
            
            socket.emit('terminal-closed', { terminalId });
            console.log(`Terminal ${terminalId} explicitly killed`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Mark terminals as orphaned instead of killing them
        Object.keys(terminals).forEach(terminalId => {
            if (terminals[terminalId].socket === socket.id) {
                orphanedTerminals.add(terminalId);
                terminals[terminalId].socket = null; // Mark as orphaned
                
                // Update database status
                db.run(`UPDATE terminal_buffers SET status = 'orphaned' WHERE terminal_id = ?`, [terminalId]);
                
                console.log(`Terminal ${terminalId} orphaned, continuing in background`);
            }
        });
    });

    socket.on('adopt-terminal', ({ terminalId }) => {
        if (orphanedTerminals.has(terminalId)) {
            // For terminals that exist only in database (after server restart)
            if (!terminals[terminalId]) {
                console.log(`Cannot adopt terminal ${terminalId} - process no longer exists after server restart`);
                orphanedTerminals.delete(terminalId);
                db.run(`UPDATE terminal_buffers SET status = 'exited' WHERE terminal_id = ?`, [terminalId]);
                return;
            }
            
            terminals[terminalId].socket = socket.id;
            orphanedTerminals.delete(terminalId);
            
            // Update database status
            db.run(`UPDATE terminal_buffers SET status = 'active' WHERE terminal_id = ?`, [terminalId]);
            
            console.log(`Terminal ${terminalId} adopted by client ${socket.id}`);
            
            // Send complete terminal buffer from database
            db.get(`SELECT buffer_data FROM terminal_buffers WHERE terminal_id = ?`, 
                   [terminalId], (err, row) => {
                if (!err && row && row.buffer_data) {
                    socket.emit('terminal-history', { terminalId, data: row.buffer_data });
                }
            });
            
            socket.emit('terminal-adopted', { terminalId });
        }
    });

    socket.on('request-history', ({ terminalId }) => {
        if (terminals[terminalId]) {
            // Get complete terminal buffer from database
            db.get(`SELECT buffer_data FROM terminal_buffers WHERE terminal_id = ?`, 
                   [terminalId], (err, row) => {
                if (!err && row && row.buffer_data) {
                    socket.emit('terminal-history', { terminalId, data: row.buffer_data });
                }
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://<VPS_IP_ADDRESS>:${PORT}`);
});
