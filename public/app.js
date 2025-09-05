class TerminalManager {
    constructor() {
        this.socket = io();
        this.terminals = new Map();
        this.activeTerminalId = null;
        this.terminalCounter = 0;
        
        this.initializeSocketEvents();
        this.initializeUI();
    }

    initializeSocketEvents() {
        this.socket.on('terminal-created', ({ terminalId }) => {
            this.createTerminalUI(terminalId);
        });

        this.socket.on('terminal-output', ({ terminalId, data }) => {
            const terminal = this.terminals.get(terminalId);
            if (terminal) {
                terminal.xterm.write(data);
            }
        });

        this.socket.on('terminal-closed', ({ terminalId }) => {
            this.closeTerminal(terminalId);
        });

        this.socket.on('existing-terminals', (terminalIds) => {
            console.log('Restoring existing terminals:', terminalIds);
            terminalIds.forEach(terminalId => {
                this.restoreTerminalUI(terminalId);
                this.socket.emit('adopt-terminal', { terminalId });
            });
        });

        this.socket.on('terminal-adopted', ({ terminalId }) => {
            console.log(`Terminal ${terminalId} reconnected`);
        });

        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }

    initializeUI() {
        const newTerminalBtn = document.getElementById('new-terminal-btn');
        newTerminalBtn.addEventListener('click', () => {
            this.createNewTerminal();
        });

        window.addEventListener('resize', () => {
            this.resizeActiveTerminal();
        });

        // Allow processes to persist when navigating away or refreshing
        window.addEventListener('beforeunload', () => {
            console.log('Page unloading, terminals will persist in background');
        });
    }

    createNewTerminal() {
        this.socket.emit('create-terminal');
    }

    restoreTerminalUI(terminalId) {
        this.terminalCounter++;
        const terminalName = `Terminal ${this.terminalCounter} (restored)`;
        this.createTerminalUIInternal(terminalId, terminalName);
    }

    createTerminalUI(terminalId) {
        this.terminalCounter++;
        const terminalName = `Terminal ${this.terminalCounter}`;
        this.createTerminalUIInternal(terminalId, terminalName);
    }

    createTerminalUIInternal(terminalId, terminalName) {

        const xterm = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#444444',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#ffffff'
            }
        });

        const fitAddon = new FitAddon.FitAddon();
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        
        xterm.loadAddon(fitAddon);
        xterm.loadAddon(webLinksAddon);

        const tabsContainer = document.getElementById('tabs');
        const terminalContainer = document.getElementById('terminal-container');

        const tab = document.createElement('button');
        tab.className = 'tab';
        tab.innerHTML = `
            <span>${terminalName}</span>
            <button class="tab-close" onclick="event.stopPropagation(); terminalManager.closeTerminal('${terminalId}')">&times;</button>
        `;
        tab.addEventListener('click', () => {
            this.switchToTerminal(terminalId);
        });

        const terminalWrapper = document.createElement('div');
        terminalWrapper.className = 'terminal-wrapper';
        terminalWrapper.id = `terminal-${terminalId}`;

        const terminalDiv = document.createElement('div');
        terminalDiv.className = 'terminal';

        terminalWrapper.appendChild(terminalDiv);
        terminalContainer.appendChild(terminalWrapper);
        tabsContainer.appendChild(tab);

        xterm.open(terminalDiv);
        
        setTimeout(() => {
            fitAddon.fit();
            this.socket.emit('resize-terminal', {
                terminalId,
                cols: xterm.cols,
                rows: xterm.rows
            });
        }, 100);

        xterm.onData((data) => {
            this.socket.emit('terminal-input', { terminalId, data });
        });

        xterm.onResize(({ cols, rows }) => {
            this.socket.emit('resize-terminal', { terminalId, cols, rows });
        });

        this.terminals.set(terminalId, {
            xterm,
            fitAddon,
            tab,
            wrapper: terminalWrapper,
            name: terminalName
        });

        this.hideWelcomeMessage();
        this.switchToTerminal(terminalId);
    }

    switchToTerminal(terminalId) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.terminal-wrapper').forEach(wrapper => {
            wrapper.classList.remove('active');
        });

        const terminal = this.terminals.get(terminalId);
        if (terminal) {
            terminal.tab.classList.add('active');
            terminal.wrapper.classList.add('active');
            this.activeTerminalId = terminalId;
            
            setTimeout(() => {
                terminal.fitAddon.fit();
                terminal.xterm.focus();
                this.socket.emit('resize-terminal', {
                    terminalId,
                    cols: terminal.xterm.cols,
                    rows: terminal.xterm.rows
                });
            }, 10);
        }
    }

    closeTerminal(terminalId) {
        const terminal = this.terminals.get(terminalId);
        if (terminal) {
            terminal.xterm.dispose();
            terminal.tab.remove();
            terminal.wrapper.remove();
            this.terminals.delete(terminalId);

            this.socket.emit('kill-terminal', { terminalId });

            if (this.activeTerminalId === terminalId) {
                const remainingTerminals = Array.from(this.terminals.keys());
                if (remainingTerminals.length > 0) {
                    this.switchToTerminal(remainingTerminals[0]);
                } else {
                    this.activeTerminalId = null;
                    this.showWelcomeMessage();
                }
            }
        }
    }

    resizeActiveTerminal() {
        if (this.activeTerminalId) {
            const terminal = this.terminals.get(this.activeTerminalId);
            if (terminal) {
                setTimeout(() => {
                    terminal.fitAddon.fit();
                    this.socket.emit('resize-terminal', {
                        terminalId: this.activeTerminalId,
                        cols: terminal.xterm.cols,
                        rows: terminal.xterm.rows
                    });
                }, 50);
            }
        }
    }

    hideWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    showWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'flex';
        }
    }
}

const terminalManager = new TerminalManager();