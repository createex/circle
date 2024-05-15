const router = require("express").Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

//Controllers
const {
    signup,
    login,
    verify,
    forgotPassword,
    resetPassword,
    updateProfilePicture,
    invite
} = require("../Controllers/auth");

//Middlewares
const { customerMiddleware } = require("../Middlewares/user");

//Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify", verify);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/invite", invite);


router.use(customerMiddleware);
router.post("/update-profile-picture", upload.single('profilePicture'), updateProfilePicture);

module.exports = router;
