// models/libraryTransaction.model.js
const mongoose = require('mongoose');

const libraryTransactionSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Links to User model
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    returnDate: { type: Date },
    status: { type: String, enum: ['Issued', 'Returned'], required: true, default: 'Issued' },
}, { timestamps: true });

libraryTransactionSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.transactionId = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('LibraryTransaction', libraryTransactionSchema);