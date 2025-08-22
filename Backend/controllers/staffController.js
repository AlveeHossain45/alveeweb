// controllers/staffController.js
const asyncHandler = require('express-async-handler');
const Staff = require('../models/staff.model.js');
const User = require('../models/user.model.js');

// @desc    Get all staff members
// @route   GET /staffs
// @access  Private
const getStaffs = asyncHandler(async (req, res) => {
    const staffs = await Staff.find({});
    res.json(staffs);
});

// @desc    Get a single staff member by ID
// @route   GET /staffs/:id
// @access  Private
const getStaffById = asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);
    if (staff) {
        res.json(staff);
    } else {
        res.status(404);
        throw new Error('Staff member not found');
    }
});

// @desc    Create a new staff profile
// @route   POST /staffs
// @access  Private (Admin)
const createStaff = asyncHandler(async (req, res) => {
    // This function creates the Staff profile. The User profile is created separately.
    const staff = new Staff({
        name: req.body.name,
        email: req.body.email,
        jobTitle: req.body.jobTitle,
        contact: req.body.contact,
        address: req.body.address,
        qualifications: req.body.qualifications,
        baseSalary: req.body.baseSalary,
        joiningDate: req.body.joiningDate || new Date(),
    });

    const createdStaff = await staff.save();
    res.status(201).json(createdStaff);
});

// @desc    Update a staff member's profile
// @route   PUT /staffs/:id
// @access  Private (Admin)
const updateStaff = asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);

    if (staff) {
        Object.assign(staff, req.body);
        const updatedStaff = await staff.save();

        // Also update the associated user record's name and email if they changed
        const user = await User.findOne({ staffId: staff._id });
        if (user && (user.name !== updatedStaff.name || user.email !== updatedStaff.email)) {
            user.name = updatedStaff.name;
            user.email = updatedStaff.email;
            await user.save();
        }

        res.json(updatedStaff);
    } else {
        res.status(404);
        throw new Error('Staff member not found');
    }
});

// @desc    Delete a staff member profile
// @route   DELETE /staffs/:id
// @access  Private (Admin)
const deleteStaff = asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);

    if (staff) {
        // Also delete the associated user login
        await User.deleteOne({ staffId: staff._id });
        await staff.deleteOne();
        res.json({ message: 'Staff member and associated user removed' });
    } else {
        res.status(404);
        throw new Error('Staff member not found');
    }
});

// @desc    Create multiple staff members and their user accounts in bulk
// @route   POST /staffs/bulk
// @access  Private (Admin)
const bulkCreateStaffs = asyncHandler(async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        res.status(400);
        throw new Error('Staff data must be a non-empty array.');
    }

    const successfulInserts = [];
    const failedRecords = [];

    for (const record of records) {
        try {
            const userExists = await User.findOne({ email: record.email });
            if (userExists) {
                throw new Error(`User with email ${record.email} already exists.`);
            }

            // 1. Create the Staff profile
            const staff = new Staff({
                name: record.name,
                email: record.email,
                jobTitle: record.jobTitle,
                contact: record.contact,
                address: record.address,
                qualifications: record.qualifications,
                baseSalary: record.baseSalary,
            });
            const createdStaff = await staff.save();

            // 2. Create the associated User account for login
            await User.create({
                name: createdStaff.name,
                email: createdStaff.email,
                password: record.password, // Remember to hash passwords in a real app
                role: createdStaff.jobTitle, // The role is taken from the job title
                staffId: createdStaff._id,   // Link to the new staff profile
            });

            successfulInserts.push(createdStaff);

        } catch (error) {
            failedRecords.push({ record, error: error.message });
        }
    }

    res.status(207).json({
        success: true,
        message: 'Bulk staff import process finished.',
        insertedCount: successfulInserts.length,
        failedCount: failedRecords.length,
        failures: failedRecords,
    });
});

// @desc    Delete multiple staff members at once
// @route   DELETE /staffs/bulk
// @access  Private (Admin)
const bulkDeleteStaffs = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('An array of staff IDs is required.');
    }

    // Also delete the associated user accounts
    await User.deleteMany({ staffId: { $in: ids } });

    // Now delete the staff profiles
    const result = await Staff.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
        res.status(404);
        throw new Error('No matching staff members found to delete.');
    }

    res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} staff members and their associated user accounts.`
    });
});

module.exports = {
    getStaffs,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    bulkCreateStaffs,
    bulkDeleteStaffs
};