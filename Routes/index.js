const router = require("express").Router();

//Project files
const auth = require('./auth');
const circle = require('./circle')

//connecting routes
router.use('/auth', auth);
router.use('/circle', circle)



module.exports = router;
