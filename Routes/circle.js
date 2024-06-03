const router = require("express").Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

//controllers
const {
    createCircle,
    updateCirlceImage,
    getCircleMembers
} = require('./../Controllers/circle')

//Middlewares
const { customerMiddleware } = require("../Middlewares/user");

//routes
router.use(customerMiddleware)
router.post('/create', createCircle)
router.post('/upload-image', upload.single('circle-image'), updateCirlceImage)
router.get('/members/:circleId', getCircleMembers)

module.exports = router;




