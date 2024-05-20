// socketMethods.js
const { getIo } = require('./socket');

// Broadcast message to a specific circle
const sendMessageToCircle = (circleId, message) => {
    const io = getIo(); 
    io.in(circleId).emit('newMessage', message);
};



module.exports = {
    sendMessageToCircle
};
