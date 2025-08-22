// models/exam.model.js
const mongoose = require('mongoose');
const examSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    // This field is essential and already exists.
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    maxMarks: { type: Number, required: true, default: 100 },
}, { timestamps: true });


examSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Exam', examSchema);