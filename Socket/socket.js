const socketIO = require("socket.io");
const jwt = require('jsonwebtoken');
const userModel = require('./../Models/user');  // Path might vary based on your project structure
const circleModel = require('./../Models/circle');
const SECRET_KEY = process.env.SECRET
let io;

module.exports = {
    init: (server) => {
        io = socketIO(server);
        
        // Middleware for connection-level authentication
        io.use((socket, next) => {
            const token = socket.handshake.headers.authorization?.split(' ')[1]; // Assuming 'Bearer YOUR_TOKEN'
            jwt.verify(token, SECRET_KEY, (err, decoded) => {
                if (err) {
                    return next(new Error('Authentication error'));
                }
                socket.userId = decoded.id; // Save user id to socket for future reference
                next();
            });
        });
        

        io.on('connection', (socket) => {
            console.log(`A user connected: ${socket.userId}`);

            // Join a room corresponding to circleId with membership check
            socket.on('joinRoom', async (circleId) => {
                try {
                    const circle = await circleModel.findById(circleId);
                    if (circle && circle.members.includes(socket.userId)) {
                        socket.join(circleId);
                        console.log(`User ${socket.userId} joined room ${circleId}`);
                    } else {
                        console.log(`User ${socket.userId} not authorized to join room ${circleId}`);
                    }
                } catch (error) {
                    console.error('Error joining room:', error);
                }
            });

            // Handle leave room
            socket.on('leaveRoom', (circleId) => {
                if (socket.rooms.has(circleId)) {
                    socket.leave(circleId);
                    console.log(`User ${socket.userId} left room ${circleId}`);
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.userId}`);
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
