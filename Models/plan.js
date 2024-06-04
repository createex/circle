const mongoose = require('mongoose');

const eventType =  new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    }

});

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        required: true
    },
    location:{
        type: String,
        required: true
    },
    eventType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EventType',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
},
    { timestamps: true }
);


//ecport the model plan and eventType
module.exports = {
    planModel: mongoose.model('Plan', planSchema),
    eventTypeModel: mongoose.model('EventType', eventType)
}



