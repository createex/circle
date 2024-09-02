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
    checkUsersByPhoneNumbers,
    getProfile,
    getMembers,
    editProfile
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
router.post("/check-users", checkUsersByPhoneNumbers);
router.post("/update-profile-picture", upload.single('profilePicture'), updateProfilePicture);
router.get("/profile", getProfile);
router.get("/members", getMembers);
router.put('/editProfile', editProfile);


module.exports = router;
