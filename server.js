const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// База данных в JSON файле (не удаляется при перезагрузке на локале, 
// но на Render диск эфемерный, для вечности лучше юзать внешнюю БД, 
// но для старта JSON хватит)
const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], messages: [] }));

const db = JSON.parse(fs.readFileSync(DB_FILE));

app.use(express.static('public'));
app.use(express.json());

// Самопрозвон для Render (чтобы не спал)
setInterval(() => {
    http.get(`http://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:3000'}`);
}, 1000 * 60 * 10); // каждые 10 минут

io.on('connection', (socket) => {
    socket.on('register', (data) => {
        const exists = db.users.find(u => u.username === data.username);
        if (exists) return socket.emit('error_auth', 'Логин занят');
        
        const newUser = { ...data, id: socket.id, online: true, premium: true };
        db.users.push(newUser);
        fs.writeFileSync(DB_FILE, JSON.stringify(db));
        socket.emit('auth_success', newUser);
    });

    socket.on('message', (msg) => {
        io.emit('chat_message', msg); // В реальном проекте лучше слать конкретному юзеру
    });

    socket.on('typing', (user) => {
        socket.broadcast.emit('user_typing', user);
    });
    
    socket.on('disconnect', () => {
        // Логика оффлайна
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));