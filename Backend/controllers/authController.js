// controllers/authController.js (Simplified - No Tokens)
const asyncHandler = require('express-async-handler');
const User = require('../models/user.model.js');
const Student = require('../models/student.model.js');
const Teacher = require('../models/teacher.model.js');

const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const email = username;

    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide both email and password.');
    }

    const user = await User.findOne({ email });

    if (user && user.password === password) {
        let fullUserDetails = { ...user.toObject() };

        if (user.role === 'Student' && user.studentId) {
            const studentProfile = await Student.findById(user.studentId);
            if (studentProfile) {
                fullUserDetails = { ...studentProfile.toObject(), ...fullUserDetails };
            }
        } else if (user.role === 'Teacher' && user.teacherId) {
            const teacherProfile = await Teacher.findById(user.teacherId);
            if (teacherProfile) {
                fullUserDetails = { ...teacherProfile.toObject(), ...fullUserDetails };
            }
        }

        fullUserDetails.id = fullUserDetails._id.toString();

        res.json({
            success: true,
            user: fullUserDetails,
            // The token is no longer sent
        });
    } else {
        res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
});

module.exports = {
    loginUser,
};