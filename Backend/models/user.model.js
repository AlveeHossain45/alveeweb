// models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'User name is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    role: {
        type: String,
        required: true,
        enum: ['Admin', 'Teacher', 'Student', 'Accountant', 'Librarian', 'Staff'],
    },
    profileImage: {
        type: String, // URL or Base64 string
        default: null,
    },
    contact: {
        type: String,
    },
    // Link to the detailed student profile
 studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        default: null,
    },
    // Link to the detailed teacher profile
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null,
    },
    // --- ADD THIS NEW SECTION ---
    // Link to the detailed staff profile
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff', // This links to the new 'Staff' model
        default: null,
    },
    // ----------------------------
}, {
    timestamps: true,
});

// Helper to ensure 'id' is returned instead of '_id'
userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
        delete returnedObject.password; 
    }
});


module.exports = mongoose.model('User', userSchema);