const router = require('express').Router();

//Controllers
const {
    sendMessage,
    getMessages,
    getConversations,
    pinMessage,
    getPinnedMessages
} = require('../Controllers/messenger');

//Middlewares
const { customerMiddleware } = require('../Middlewares/user');

//Routes
router.use(customerMiddleware);
router.post('/send', sendMessage);
router.get('/get/:circleId', getMessages);
router.get('/conversations', getConversations);
router.post('/pin/:circleId/:messageId', pinMessage);
router.get('/pinned/:circleId', getPinnedMessages);


module.exports = router;