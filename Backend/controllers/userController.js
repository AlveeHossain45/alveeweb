const asyncHandler = require('express-async-handler');
const User = require('../models/user.model.js');

// @desc    Get all users (primarily for the 'Staff' page)
// @route   GET /users
// @access  Private (Admin/Authenticated)
const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find({});
    res.json(users);
});

// @desc    Get a single user by ID
// @route   GET /users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});


// @desc    Create a new user (for new students, teachers, or staff)
// @route   POST /users
// @access  Private (Admin)
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, studentId, teacherId, contact } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User with this email already exists');
    }
    
    // In a real app, you MUST hash the password before saving.
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email,
        password, // In a real app, this would be hashedPassword
        role,
        studentId,
        teacherId,
        contact,
    });

    if (user) {
        res.status(201).json(user);
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Update a user's profile
// @route   PUT /users/:id
// @access  Private
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        user.contact = req.body.contact || user.contact;
        user.profileImage = req.body.profileImage || user.profileImage;

        if (req.body.password) {
            // Hash password before saving
            user.password = req.body.password;
        }

        const updatedUser = await user.save();
        res.json(updatedUser);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc    Delete a user
// @route   DELETE /users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
        await user.deleteOne();
        res.json({ message: 'User removed' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

const bulkCreateUsers = asyncHandler(async (req, res) => {
    const usersToInsert = req.body;

    if (!Array.isArray(usersToInsert) || usersToInsert.length === 0) {
        res.status(400);
        throw new Error('No user data provided or data is not an array.');
    }

    try {
        const result = await User.insertMany(usersToInsert, { ordered: false });
        res.status(201).json({
            success: true,
            message: `Bulk operation completed.`,
            insertedCount: result.length,
            failedCount: 0,
            errors: []
        });
    } catch (error) {
        res.status(207).json({
            success: true,
            message: `Bulk operation completed with some errors.`,
            insertedCount: error.insertedDocs.length,
            failedCount: error.writeErrors.length,
            errors: error.writeErrors.map(e => ({ index: e.index, message: e.err.errmsg }))
        });
    }
});

const bulkDeleteUsers = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('An array of user IDs is required.');
    }

    // We add a filter to ensure we don't accidentally delete users who are students/teachers
    // This endpoint should only be for "Staff" type roles.
    const result = await User.deleteMany({
        _id: { $in: ids },
        role: { $nin: ['Student', 'Teacher'] }
    });

    if (result.deletedCount === 0) {
        res.status(404);
        throw new Error('No matching staff members found to delete.');
    }

    res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} staff members.`
    });
});



module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    bulkCreateUsers,
    bulkDeleteUsers  // NEW

};