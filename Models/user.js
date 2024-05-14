const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phoneNumber: String,
    profilePicture: String,
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationCode: {
        code: String,
        expires: Date,
    },    
    });


 module.exports = mongoose.model("User", userSchema);   