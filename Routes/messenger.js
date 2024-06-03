const router = require('express').Router();

//Controllers
const {
    sendMessage,
    getMessages,
    getConversations
} = require('../Controllers/messenger');

//Middlewares
const { customerMiddleware } = require('../Middlewares/user');

//Routes
router.use(customerMiddleware);
router.post('/send', sendMessage);
router.get('/get/:circleId', getMessages);
router.get('/conversations', getConversations);


module.exports = router;