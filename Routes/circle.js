const router = require("express").Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

//controllers
const {
    createCircle,
    updateCirlceImage,
    getCircleMembers,
    getAllCircles,
    removeCircleMember,
    updateCircle,
    getCircleById,
    addCircleMember

} = require('./../Controllers/circle')

//Middlewares
const { customerMiddleware } = require("../Middlewares/user");

//routes
router.use(customerMiddleware)
router.post('/create', createCircle)
router.post('/upload-image', upload.single('circle-image'), updateCirlceImage)
router.get('/members/:circleId', getCircleMembers)
router.get('/all', getAllCircles)
router.delete('/remove-member/:circleId/:memberId', removeCircleMember)
router.put('/update/:circleId', updateCircle)
router.get('/get-circle/:circleId', getCircleById)
router.post('/add-member/:circleId', addCircleMember)


module.exports = router;




