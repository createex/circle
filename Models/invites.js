const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    circle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Circle',
        required: true,
    },
    accepted: {
        type: Boolean,
        default: false,
    },
    inviteSentAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Invite', inviteSchema);
