const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Serve specific folders statically so Express properly sends CSS and other assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/html', express.static(path.join(__dirname, 'html')));

// Ensure root URL goes to voorkant.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'voorkant.html'));
});

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        console.log('Received:', message.toString());
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
                client.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});