const router = require("express").Router();

//Project files
const auth = require('./auth');
const circle = require('./circle')
const upload = require('./upload')
const messenger = require('./messenger')
const todos = require('./todos')
const stories = require('./stories')
const itinerary = require('./itinerary')
const plan = require('./plan')

//connecting routes
router.use('/auth', auth);
router.use('/circle', circle)
router.use('/upload', upload)
router.use('/messenger', messenger)
router.use('/todos', todos)
router.use('/stories', stories)
router.use('/itinerary', itinerary)
router.use('/plan', plan)




module.exports = router;
