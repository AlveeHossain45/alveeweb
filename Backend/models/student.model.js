// models/student.model.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    rollNo: { type: String, required: true, unique: true },
    sectionId: { // <-- CHANGE THIS
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section', // <-- CHANGE THIS
        default: null // The field can now be empty
    },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true },
    guardianName: { type: String, required: true },
    profileImage: { type: String, default: null },
    enrollmentDate: { type: Date, default: Date.now },
    bloodGroup: { type: String },
}, { timestamps: true });

studentSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Student', studentSchema);