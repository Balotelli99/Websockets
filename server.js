const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const connectedUsers = new Map();

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/html', express.static(path.join(__dirname, 'html')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'voorkant.html'));
});

function broadcastUserList() {
    const userList = Array.from(connectedUsers.values()).map(u => ({ username: u.username }));
    const message = JSON.stringify({ type: 'userList', users: userList });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
    console.log('User list broadcast:', userList);
}

function sendPrivateMessage(senderWs, targetUsername, content) {
    let targetWs = null;
    for (const [ws, user] of connectedUsers.entries()) {
        if (user.username === targetUsername) {
            targetWs = ws;
            break;
        }
    }
    
    if (targetWs && targetWs.readyState === 1) {
        const senderName = connectedUsers.get(senderWs).username;
        const message = JSON.stringify({
            type: 'privateMessage',
            from: senderName,
            content: content
        });
        targetWs.send(message);
        console.log(`Private message from ${senderName} to ${targetUsername}: ${content}`);
    }
}

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        console.log('Received:', data);
        
        if (data.type === 'login') {
            connectedUsers.set(ws, { username: data.username });
            console.log(`User logged in: ${data.username}`);
            broadcastUserList();
        } else if (data.type === 'privateMessage') {
            sendPrivateMessage(ws, data.to, data.content);
        }
    });

    ws.on('close', () => {
        const user = connectedUsers.get(ws);
        if (user) {
            console.log(`User disconnected: ${user.username}`);
            connectedUsers.delete(ws);
            broadcastUserList();
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});