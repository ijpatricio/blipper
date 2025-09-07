# Product Requirements Document: Blipper

## Product Overview

**Blipper** is a web-based multi-terminal application that provides users with the ability to create, manage, and interact with multiple terminal sessions through a web interface. Built using modern web technologies, it offers a browser-based alternative to traditional terminal applications.

## Core Features

### 1. Multi-Terminal Management
- **Create Multiple Terminals**: Users can spawn multiple independent terminal sessions
- **Tab-Based Interface**: Each terminal session is displayed as a separate tab for easy navigation
- **Session Isolation**: Each terminal runs as an independent process with its own state

### 2. Real-Time Terminal Interaction
- **Live Terminal Output**: Real-time streaming of terminal output to the web interface
- **Input Handling**: Full keyboard input support including special keys and shortcuts
- **Responsive Resizing**: Automatic terminal resize based on browser window dimensions

### 3. Web-Based Interface
- **Modern UI**: Clean, dark-themed terminal interface with customizable colors
- **Responsive Design**: Works across different screen sizes and devices
- **Web Links Support**: Clickable links in terminal output

### 4. Authentication System
- **Basic Authentication**: HTTP Basic Auth implemented for both web server and WebSocket connections
- **Security Layer**: Protects terminal access from unauthorized users
- **Note**: Originally specified "no built-in authentication" but was added for security

### 5. Terminal Persistence
- **SQLite Database**: Persistent storage for terminal session data
- **Session Recovery**: Terminals survive server restarts and client disconnections
- **History Preservation**: Terminal output and state maintained across sessions
- **Database Schema**: Structured storage for terminal metadata and content

### 6. Orphaned Terminal Management
- **Disconnection Handling**: Terminals continue running when clients disconnect
- **Background Execution**: Processes persist independently of web interface
- **Resource Management**: Automatic cleanup and monitoring of orphaned sessions

### 7. Terminal Restoration
- **Reconnection Support**: Users can reconnect to existing terminal sessions
- **State Recovery**: Terminal history and current state restored on reconnection
- **Session Continuity**: Seamless user experience across browser refreshes
- **Cross-Session Access**: Terminals accessible from different browser sessions

## Technical Architecture

### Backend (Node.js)
- **Express.js**: Web server for serving static files
- **Socket.IO**: Real-time bidirectional communication between client and server
- **node-pty**: Pseudo-terminal interface for spawning shell processes
- **Process Management**: Automatic cleanup of terminal processes on client disconnect

### Frontend (Web)
- **XTerm.js**: Full-featured terminal emulator in the browser
- **Socket.IO Client**: Real-time communication with the backend
- **Modern JavaScript**: ES6+ class-based architecture for terminal management

## User Experience

### Primary User Flow
1. User opens the web application in their browser
2. Clicks "New Terminal" to create their first terminal session
3. Interacts with the terminal using keyboard input
4. Can create additional terminals as needed using tabs
5. Switch between terminals using tab navigation
6. Close terminals individually when no longer needed

### Key Interactions
- **Terminal Creation**: Single click to spawn new terminal
- **Tab Management**: Click to switch, X button to close
- **Input/Output**: Standard terminal keyboard shortcuts and commands
- **Window Resize**: Automatic terminal fitting to browser window

## Security Considerations

- Terminal processes run with the same permissions as the server process
- Process isolation ensures terminals don't interfere with each other
- Basic Auth for the Http server and for the Websocket Server
