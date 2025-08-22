// models/book.model.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String, unique: true, sparse: true }, // sparse allows multiple null values
    publicationYear: { type: Number },
    genre: { type: String },
    totalCopies: { type: Number, required: true, default: 1 },
    availableCopies: { type: Number, required: true, default: 1 },
}, { timestamps: true });

// In your application logic, ensure availableCopies <= totalCopies
bookSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        // Renaming _id to bookId to match frontend expectation
        returnedObject.bookId = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Book', bookSchema);