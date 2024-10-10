const { getIo } = require('./socket');

// Broadcast message to a specific circle
const sendMessageToCircle = (circleId, message) => {
    const io = getIo();
    io.in(circleId).emit('newMessageInChat', message); // Emit to specific room in the chat details screen
};

// Broadcast message update for chat list
const sendMessageToChatList = (circleId, lastMessageData) => {
    const io = getIo();
    io.emit('newMessageInList', { circleId, ...lastMessageData }); // Emit message update for chat list
};

module.exports = {
    sendMessageToCircle,
    sendMessageToChatList
};
