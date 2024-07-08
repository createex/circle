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
    itineraries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary' }], 
    ownedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    memberGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],  
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EventType' }],
    plans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }],
    });
    


 module.exports = mongoose.model("User", userSchema);   