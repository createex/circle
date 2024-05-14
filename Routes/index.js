const router = require("express").Router();

//Project files
const auth = require('./auth');

//connecting routes
router.use('/auth', auth);


module.exports = router;
