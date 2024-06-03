const router = require("express").Router();

//Project files
const{
    createStory,
    getStoriesForCircle
} = require('../Controllers/stories')

//Middlewares
const { customerMiddleware } = require("../Middlewares/user");

//routes
router.use(customerMiddleware)
router.post('/create/:circleId', createStory)
router.get('/:circleId', getStoriesForCircle)

module.exports = router;