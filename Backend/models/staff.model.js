// models/staff.model.js
const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    jobTitle: { 
        type: String, 
        required: true,
        // The enum here ensures that the job title maps to a valid role in the User model
        enum: ['Admin', 'Accountant', 'Librarian', 'Staff'] 
    },
    contact: { type: String, required: true },
    address: { type: String },
    qualifications: { type: String },
    profileImage: { type: String, default: null },
    bloodGroup: { type: String },
    joiningDate: { type: Date, default: Date.now },
    baseSalary: { type: Number, default: 0 },
}, { timestamps: true });

staffSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Staff', staffSchema);