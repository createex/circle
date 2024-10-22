const mongoose = require('mongoose');

const circleSchema = new mongoose.Schema({
    circleName: String, 
    circleImage: String,
    description: String,
    type: String,
    circle_interests: [String],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    convos: { type: mongoose.Schema.Types.ObjectId, ref: 'Convos' },
    experiences: { type: mongoose.Schema.Types.ObjectId, ref: 'Experience' },
    todos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Todo' }],
    //plans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }],
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'EventType' }],
},
    { timestamps: true }
);

module.exports = mongoose.model('Circle', circleSchema);
