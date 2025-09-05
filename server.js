const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const pty = require('node-pty');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const terminals = {};
const orphanedTerminals = new Set();
const terminalHistory = new Map(); // Store complete terminal history
const MAX_HISTORY_SIZE = 50000; // Max characters of history per terminal (50KB)
let terminalCounter = 0;

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send existing orphaned terminals to new client
    socket.emit('existing-terminals', Array.from(orphanedTerminals));

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
            socket: socket.id
        };

        // Initialize history buffer for this terminal
        terminalHistory.set(terminalId, '');

        term.on('data', (data) => {
            // Always add to history buffer
            let history = terminalHistory.get(terminalId) + data;
            if (history.length > MAX_HISTORY_SIZE) {
                // Keep the most recent history by trimming from the beginning
                history = history.slice(-MAX_HISTORY_SIZE);
            }
            terminalHistory.set(terminalId, history);

            // Send data to client if connected
            if (terminals[terminalId].socket) {
                io.to(terminals[terminalId].socket).emit('terminal-output', { terminalId, data });
            }
        });

        term.on('exit', () => {
            delete terminals[terminalId];
            orphanedTerminals.delete(terminalId);
            terminalHistory.delete(terminalId);
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
            terminalHistory.delete(terminalId);
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
                console.log(`Terminal ${terminalId} orphaned, continuing in background`);
            }
        });
    });

    socket.on('adopt-terminal', ({ terminalId }) => {
        if (terminals[terminalId] && orphanedTerminals.has(terminalId)) {
            terminals[terminalId].socket = socket.id;
            orphanedTerminals.delete(terminalId);
            console.log(`Terminal ${terminalId} adopted by client ${socket.id}`);
            
            // Send complete terminal history
            if (terminalHistory.has(terminalId)) {
                const history = terminalHistory.get(terminalId);
                if (history) {
                    socket.emit('terminal-history', { terminalId, data: history });
                }
            }
            
            socket.emit('terminal-adopted', { terminalId });
        }
    });

    socket.on('request-history', ({ terminalId }) => {
        if (terminals[terminalId] && terminalHistory.has(terminalId)) {
            const history = terminalHistory.get(terminalId);
            if (history) {
                socket.emit('terminal-history', { terminalId, data: history });
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});