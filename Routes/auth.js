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
    invite,
    resendCode,
    checkUsersByPhoneNumbers
} = require("../Controllers/auth");

//Middlewares
const { customerMiddleware } = require("../Middlewares/user");

//Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/verify", verify);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-code", resendCode);




router.use(customerMiddleware);
router.post("/invite", invite);
router.get("/check-users", checkUsersByPhoneNumbers);
router.post("/update-profile-picture", upload.single('profilePicture'), updateProfilePicture);

module.exports = router;
