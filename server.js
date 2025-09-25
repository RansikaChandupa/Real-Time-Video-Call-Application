const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

require('dotenv').config();
const app = express();
app.use(cors());

app.get('/api/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_KEY
    });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const server = app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
})

const io = socketIo(server);
const roomHosts = {};
const roomUsers = {};

io.on('connection', socket => {
    console.log("New connection detected: ", socket.id);
    socket.on('join-room', (roomId, userId, role) => {
        console.log(`${role === 'host' ?  'Host' : 'User'} ${userId} joining room: ${roomId}`);
        socket.join(roomId);
        if (!roomUsers[roomId]) {
            roomUsers[roomId] = [];
        }
        if (!roomUsers[roomId].includes(userId)) {
            roomUsers[roomId].push(userId);
        }
        
        if (role === 'host') {
            roomHosts[roomId] = userId;
            console.log(`Host ${userId} created room ${roomId}`);
        } else {
            console.log(`User ${userId} joined room ${roomId}`);
            socket.to(roomId).emit('user-connected', userId);
        }

        socket.roomId = roomId;
        socket.userId = userId;
        socket.isHost = (role === 'host');
        
        socket.on('disconnect', () => {
            console.log(`User ${socket.userId} disconnected from room ${socket.roomId}`);
            if (roomUsers[socket.roomId]) {
                roomUsers[socket.roomId] = roomUsers[socket.roomId].filter(id => id !== socket.userId);
                socket.to(socket.roomId).emit('user-disconnected', socket.userId);
                if (roomUsers[socket.roomId].length === 0) {
                    delete roomUsers[socket.roomId];
                }
            }
            if (socket.isHost && roomHosts[socket.roomId] === socket.userId) {
                delete roomHosts[socket.roomId];
            }
        });
    });

    socket.on('request-join', (roomId, userId) => {
        console.log(`User ${userId} is requesting to join room ${roomId}`);
        if (roomHosts[roomId]) {
            socket.join(roomId);
            socket.to(roomId).emit('user-request-join', userId, roomId);
        } else {
            socket.emit('join-rejected', userId, 'Room does not exist');
        }
    });

    socket.on('approve-join', (roomId, userId) => {
        console.log(`Host approving user ${userId} to join room ${roomId}`);
        const hostId = roomHosts[roomId];
        io.to(roomId).emit('join-approved', userId, hostId);
    });

    socket.on('reject-join', (roomId, userId, reason) => {
        console.log(`Host rejected user ${userId} from room ${roomId}`);
        io.to(roomId).emit('join-rejected', userId, reason || 'Host rejected your request');
    });

    socket.on('relay-ice-candidate', (roomId, senderId, targetId, candidate) => {
        console.log(`Relaying ICE candidate from ${senderId} to ${targetId} in room ${roomId}`);
        socket.to(roomId).emit('ice-candidate', senderId, targetId, candidate);
    });

    socket.on('relay-offer', (roomId, senderId, targetId, offer) => {
        console.log(`Relaying offer from ${senderId} to ${targetId} in room ${roomId}`);
        io.to(roomId).emit('offer', senderId, targetId, offer);
    });

    socket.on('relay-answer', (roomId, senderId, targetId, answer) => {
        console.log(`Relaying answer from ${senderId} to ${targetId} in room ${roomId}`);
        io.to(roomId).emit('answer', senderId, targetId, answer);
    });
});