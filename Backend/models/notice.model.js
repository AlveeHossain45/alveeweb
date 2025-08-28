// models/notice.model.js
const mongoose = require('mongoose');

// --- THIS IS THE NEW, MORE FLEXIBLE STRUCTURE FOR MULTIPLE REACTION TYPES ---
const reactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Links this reaction to a specific user
        required: true
    },
    type: {
        type: String, // Will store the emoji itself, e.g., "👍"
        required: true,
        // --- CRITICAL FIX ---
        // The 'enum' has been REMOVED. This is essential to allow ANY emoji
        // to be stored, not just a predefined list of words.
    }
}, { _id: false }); // No separate _id is needed for each reaction.

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    authorId: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String, enum: ['notice', 'private_message'], default: 'notice' },
    messageType: { type: String, enum: ['text', 'image', 'audio'], default: 'text' },
    
    // This is the array that will hold all the reactions for this notice.
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
