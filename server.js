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

        term.on('data', (data) => {
            socket.emit('terminal-output', { terminalId, data });
        });

        term.on('exit', () => {
            delete terminals[terminalId];
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
            
            // Re-establish data flow
            terminals[terminalId].process.removeAllListeners('data');
            terminals[terminalId].process.on('data', (data) => {
                socket.emit('terminal-output', { terminalId, data });
            });
            
            socket.emit('terminal-adopted', { terminalId });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});