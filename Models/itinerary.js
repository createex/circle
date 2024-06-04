const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    about: {
        type: String,
        required: false
    },
    date: {
        type: Date,
        required: true
    },
    time:{
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Itinerary', itinerarySchema);
