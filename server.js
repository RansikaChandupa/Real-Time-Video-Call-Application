const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { Socket } = require('react-chat-engine');

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
app.get('/', (req, res) =>{
    res.redirect('/login.html');
});

const server = app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
})

const io = socketIo(server);
const roomHosts = {};
const roomUsers = {};

io.on('connection', socket => {
    console.log("New connection detected: ", socket.id);
    socket.on('join-room',(roomId, userId, role) => {
        console.log(`${role === 'host' ?  'Host' : 'User'} ${userId} joining room: ${roomId}`);
        socket.join(roomId);
        if (!roomUsers[roomId]){
            roomUsers[roomId] = [];
        }
        roomUsers[roomId].push(userId)
        if (role === 'host'){
            roomHosts[roomId] = userId;
            console.log(`Host ${userId} created room ${roomId}`)
        }
        else{
            console.log(`User ${userId} joined room ${roomId}`);
            socket.to(roomId).emit('user-connected', userId);
        }

        socket.roomId = roomId;
        socket.userId = userId;
        socket.isHost = (role === 'host');
        socket.on('disconnect', (roomId, userId, role) => {
            console.log(`User ${userId} disconnected from room ${roomId} `);
            if (roomUsers[roomId]){
                roomUsers[roomId]= roomUsers[roomId].filter(id => id !== userId);
                if (roomUsers[length] === 0){
                    delete roomUsers[roomId];
                }
            
            }
            if(role === 'host' && roomHosts[roomId] === userId){
                delete roomHosts[roomId];
                socket.to(roomId).emit('host-disconnected', userId);
            }
        })
    
    });
    socket.on('request-join',(roomId, userId) => {
        console.log(`User ${userId} is requesting to join room ${roomId}`);
        if(roomHosts[roomId]){
            socket.join(roomId);
            socket.roomId = roomId;
            socket.userId = userId;
            socket.to(roomId).emit('user-request', userId, roomId);
        }
        else{
            console.log(`Room ${roomId} does not exist. User ${userId} cannot join.`);
            socket.emit('join-rejected', 'Room does not exist');        
        }
    })
    socket.on('approve-join', (roomId, userId) => {
        console.log(`Host approving user ${userId} to join room ${roomId}`);
        if(!roomUsers[roomId]){
            roomUsers[roomId] = [];
        }
        if(!roomUsers[roomId].includes(userId)){
            roomUsers[roomId].push(userId);
        }
        const hostId = roomHosts[roomId];
        io.to(roomId).emit('join-approved', userId, hostId);
        setTimeout(()=>{
            io.to(roomId).emit('user-connected', userId)
        }, 500);
    });
    socket.on('reject-join', (roomId, userId) => {
        console.log(`Host rejected user ${userId} to join room ${roomId}`);
        io.to(roomId).emit('join-rejected', 'Host rejected your request');
    });
    socket.on('relay-ice-candidate', (roomId, senderId, targetId, candidate) => {
        console.log(`Relaying ICE canddate from ${senderId} to ${targetId} in room ${roomId}`);
        socket.to(roomId).emit('ice-candidate', senderId, candidate);
    });
    socket.on('relay-offer', (roomId, senderId, targetId, offer) => {
        console.log(`Relaying offer from ${senderId} to ${targetId} in room ${roomId}`);
        io.to(roomId).emit('offer', senderId, offer);
    });
    socket.on('relay-answer', (roomId, senderId, targetId, answer) => {
        console.log(`Relaying answer from ${senderId} to ${targetId} in room ${roomId}`);
        io.to(roomId).emit('answer', senderId, targetId, answer);
    })
});
 


