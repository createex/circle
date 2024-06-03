const mongoose = require('mongoose')

const canvosSchema = new mongoose.Schema({

    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
    
},
    { timestamps: true }
)


module.exports = mongoose.model('Convos', canvosSchema) 