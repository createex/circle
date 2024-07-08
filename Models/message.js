const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    type: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: { type: String, required: true }
});

const messageSchema = new mongoose.Schema({
    message: { type: String, default: '' },
    type: { type: String, default: 'text' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'circle' },
    media: [mediaSchema]  
}, 
{
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
