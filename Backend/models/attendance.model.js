// models/attendance.model.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true }, // Added for better querying
    date: { type: Date, required: true },
    status: { type: String, enum: ['Present', 'Absent', 'Late', 'Leave'], required: true }, // Added 'Leave'
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // For audit log
}, { timestamps: true });

// Prevent duplicate entries for the same student in the same section on the same day
attendanceSchema.index({ studentId: 1, sectionId: 1, date: 1 }, { unique: true });

attendanceSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Attendance', attendanceSchema);