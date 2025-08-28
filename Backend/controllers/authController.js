// controllers/authController.js (Simplified - No Tokens)
const asyncHandler = require('express-async-handler');
const User = require('../models/user.model.js');
const Student = require('../models/student.model.js');
const Teacher = require('../models/teacher.model.js');

const loginUser = asyncHandler(async (req, res) => {
    // 1. Get all three pieces of data from the frontend
    const { username, password, portal } = req.body;
    const email = username;

    if (!email || !password || !portal) {
        res.status(400);
        throw new Error('Please provide email, password, and portal.');
    }

    // 2. Define the mapping between the portal name and the role in the database
    const portalToRoleMap = {
        'Administration': 'Admin',
        'Teacher': 'Teacher',
        'Student': 'Student',
        'Accountant': 'Accountant',
        'Librarian': 'Librarian'
    };

    const expectedRole = portalToRoleMap[portal];

    // Handle if an invalid portal name is somehow sent
    if (!expectedRole) {
        res.status(400).json({ success: false, message: 'Invalid portal specified.' });
        return;
    }

    // 3. Authenticate credentials first
    const user = await User.findOne({ email });

    if (user && user.password === password) {
        // --- 4. NEW: ROLE VALIDATION STEP ---
        // Credentials are correct, now check if the user's role matches the portal they used.
        if (user.role === expectedRole) {
            // SUCCESS: Roles match! Proceed with the login.
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
            });
        } else {
            // FAILURE: Roles do NOT match. Send a specific error message.
            res.status(401).json({
                success: false,
                message: `Invalid credentials for this portal. Please use the correct portal for your role.`
            });
        }
    } else {
        // FAILURE: Credentials are wrong from the start.
        res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }
});

module.exports = {
    loginUser,
};