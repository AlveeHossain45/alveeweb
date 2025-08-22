// models/section.model.js
const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    name: { // e.g., "Section A", "Morning Shift"
        type: String,
        required: true
    },
    // --- CHANGED: Link to the parent Subject instead of Department ---
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
    },
    classTeacherId: { // The main teacher for this specific section
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        // This can be optional, as multiple teachers can be assigned via timetable
    },
    // --- REMOVED: The 'subjects' array is no longer needed here ---
    academicYear: { type: String, default: () => new Date().getFullYear().toString() },
    roomNumber: { type: String },
}, { timestamps: true });

// --- CHANGED: Ensure a section name is unique within the same parent subject ---
sectionSchema.index({ name: 1, subjectId: 1 }, { unique: true });

sectionSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Section', sectionSchema);