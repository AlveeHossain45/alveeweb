// models/teacher.model.js
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        default: null
    },
    contact: { type: String, required: true },
    address: { type: String },
    qualifications: { type: String },
    profileImage: { type: String, default: null },
    bloodGroup: { type: String },
    joiningDate: { type: Date, default: Date.now },
    baseSalary: { type: Number, default: 0 },
}, { timestamps: true });

teacherSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Teacher', teacherSchema);