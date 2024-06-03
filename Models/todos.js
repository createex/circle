const mongoose = require('mongoose')


const todoSchema = new mongoose.Schema({
    title: String,
    description: String,
    images: [String],
    bill: {
        total: Number,
        title: String,
        images: [String],
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        paidBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

    }

})  

module.exports = mongoose.model('Todo', todoSchema)