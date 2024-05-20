const router = require("express").Router();

//Project files
const auth = require('./auth');
const circle = require('./circle')
const upload = require('./upload')
const messenger = require('./messenger')

//connecting routes
router.use('/auth', auth);
router.use('/circle', circle)
router.use('/upload', upload)
router.use('/messenger', messenger)




module.exports = router;
