const socketIO = require("socket.io");
const jwt = require('jsonwebtoken');
const userModel = require('./../Models/user');
const circleModel = require('./../Models/circle');
const messageModel = require('./../Models/message'); // Assuming this is where your message schema is
const SECRET_KEY = process.env.SECRET;
let io;

module.exports = {
    init: (server) => {
        io = socketIO(server);

        // Middleware for connection-level authentication
        io.use((socket, next) => {
            const token = socket.handshake.headers.authorization?.split(' ')[1]; // Assuming 'Bearer YOUR_TOKEN'
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            jwt.verify(token, SECRET_KEY, (err, decoded) => {
                if (err) {
                    return next(new Error('Authentication error: Invalid token'));
                }
                socket.userId = decoded.id;
                next();
            });
        });

        io.on('connection', (socket) => {
            console.log(`A user connected: ${socket.userId}`);

            // Join chat list room when chat screen is opened
            socket.on('chatScreenOpen', async () => {
                console.log(`User ${socket.userId} opened chat screen`);
                // Fetch circles for the user and join those rooms
                const userCircles = await circleModel.find({ members: socket.userId }).select('_id');
                userCircles.forEach(circle => {
                    socket.join(circle._id.toString()); // Join rooms based on circle ids
                    console.log(`User ${socket.userId} joined room ${circle._id}`);
                });
            });

            // Leave all chat rooms when chat screen is closed
            socket.on('chatScreenClose', () => {
                console.log(`User ${socket.userId} closed chat screen`);
                const rooms = Array.from(socket.rooms);
                rooms.forEach(room => {
                    if (room !== socket.id) { // Leave all rooms except the default one
                        socket.leave(room);
                        console.log(`User ${socket.userId} left room ${room}`);
                    }
                });
            });

            // Join a specific room (circle) when user enters chat details
            socket.on('joinRoom', async (circleId) => {
                console.log(`User ${socket.userId} attempting to join room ${circleId}`);
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

            // Leave a specific room (circle) when user exits chat details
            socket.on('leaveRoom', (circleId) => {
                if (socket.rooms.has(circleId)) {
                    socket.leave(circleId);
                    console.log(`User ${socket.userId} left room ${circleId}`);
                } else {
                    console.log(`User ${socket.userId} was not in room ${circleId}`);
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
