// models/result.model.js
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam', // Links this result to a specific exam schedule
        required: [true, 'An exam ID is required for a result.'],
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student', // Links this result to a specific student
        required: [true, 'A student ID is required for a result.'],
    },
    marks: {
        type: Number,
        required: [true, 'Marks are required for a result entry.'],
        min: 0, // Marks cannot be negative
    },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
});

// --- The Key to Data Integrity and Performance ---
// This compound index ensures that a single student cannot have more than one
// result entry for the exact same exam. This is crucial for preventing
// data corruption and makes the "saveResults" function (which uses upsert)
// safe and efficient.
resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// --- Convenience and Consistency ---
// Your frontend script consistently uses '.id' instead of '._id'.
// This transform automatically converts the document when it's sent as JSON,
// ensuring it matches the frontend's expectations perfectly.
resultSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Result', resultSchema);