// models/acquisition.model.js
const mongoose = require('mongoose');

const acquisitionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    reason: { type: String, required: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    acquiredDate: { type: Date }, // To be filled when the book is acquired
}, { timestamps: true });

acquisitionSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Acquisition', acquisitionSchema);