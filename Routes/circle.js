const router = require("express").Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

//controllers
const {
    createCircle,
    updateCirlceImage
} = require('./../Controllers/circle')

//Middlewares
const { customerMiddleware } = require("../Middlewares/user");

//routes
router.post('./create', createCircle)
router.post('/upload-image', upload.single('circle-image'), updateCirlceImage)

module.exports = router;




