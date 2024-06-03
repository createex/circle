const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mediaSchema = new Schema({
    url: { type: String, required: true }, 
    type: { type: String, enum: ['image', 'video'], required: true } 
}, { _id: false }); 

// Story schema
const storySchema = new Schema({
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    circle: {
        type: Schema.Types.ObjectId,
        ref: 'Circle',
        required: true
    },
    text: String, // Optional text
    media: mediaSchema, // Single media item
    expiresAt: {
        type: Date,
        default: () => Date.now() + 24*60*60*1000 // Expires 24 hours from creation
    }
}, { timestamps: true });

// Index to automatically remove expired stories
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
