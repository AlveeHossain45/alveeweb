// models/notice.model.js
const mongoose = require('mongoose');

// --- THIS IS THE NEW, MORE FLEXIBLE STRUCTURE FOR MULTIPLE REACTION TYPES ---
const reactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['like', 'heart', 'haha', 'crying'] // Define the allowed reaction types
    }
}, { _id: false }); // We don't need a separate _id for each reaction sub-document

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    authorId: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String, enum: ['notice', 'private_message'], default: 'notice' },
    messageType: { type: String, enum: ['text', 'image', 'audio'], default: 'text' },
    
    // --- THIS REPLACES THE OLD 'likes' and 'dislikes' ARRAYS ---
    reactions: [reactionSchema]

}, { timestamps: true });

noticeSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Notice', noticeSchema);