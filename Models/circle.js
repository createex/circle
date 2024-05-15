const mongoose = require('mongoose');

const circleSchema = new mongoose.Schema({
    circleName: String, 
    circleImage: String,
    description: String,
    type: String,
    interest: String,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

});

module.exports = mongoose.model('Circle', circleSchema);