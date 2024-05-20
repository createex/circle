const router = require('express').Router();

//Controllers
const {
    sendMessage,
} = require('../Controllers/messenger');

//Middlewares
const { customerMiddleware } = require('../Middlewares/user');

//Routes
router.use(customerMiddleware);
router.post('/send', sendMessage);

module.exports = router;