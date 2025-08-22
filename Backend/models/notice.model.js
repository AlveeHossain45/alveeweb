// models/notice.model.js
const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    authorId: { type: String, required: true }, // Could be a teacher ID, student ID, or 'admin'
    target: { type: String, required: true }, // e.g., 'All', 'Student', 'class_123', 'studentId_456'
    type: { type: String, enum: ['notice', 'private_message'], default: 'notice' },
    messageType: { type: String, enum: ['text', 'image', 'audio'], default: 'text' },
}, { timestamps: true });

noticeSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Notice', noticeSchema);