// models/classLevel.model.js
const mongoose = require('mongoose');

const classLevelSchema = new mongoose.Schema({
    name: { // e.g., "Class 10", "HSC 1st Year"
        type: String,
        required: true,
        unique: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
    },
    subjects: [{ // An array of subjects for this level
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
    }],
}, { timestamps: true });

classLevelSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('ClassLevel', classLevelSchema);