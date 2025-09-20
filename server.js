const express = require('express');
const socketIo = require('socket.io');
const path = require('path');
const { Socket } = require('react-chat-engine');

const app = express();
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
                if (roomUsere[length] === 0){
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
});
 


