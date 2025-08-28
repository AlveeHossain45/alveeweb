// controllers/staffController.js
const asyncHandler = require('express-async-handler');
const Staff = require('../models/staff.model.js');
const User = require('../models/user.model.js');
const sharp = require('sharp');
const { put } = require('@vercel/blob'); // Vercel Blob SDK

const getStaffs = asyncHandler(async (req, res) => {
    const staffs = await Staff.find({});
    res.json(staffs);
});

const getStaffById = asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);
    if (staff) {
        res.json(staff);
    } else {
        res.status(404);
        throw new Error('Staff member not found');
    }
});

const createStaff = asyncHandler(async (req, res) => {
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

const updateStaff = asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);
    if (staff) {
        Object.assign(staff, req.body);
        if (req.file) {
            const filename = `${Date.now()}-${staff._id}.webp`;
            const imageBuffer = await sharp(req.file.buffer)
                .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer();
            const blob = await put(filename, imageBuffer, { access: 'public' });
            staff.profileImage = blob.url;
        }
        const updatedStaff = await staff.save();
        const user = await User.findOne({ staffId: staff._id });
        if (user) {
            user.name = updatedStaff.name;
            user.email = updatedStaff.email;
            if (staff.profileImage) {
                user.profileImage = staff.profileImage;
            }
            await user.save();
        }
        res.json(updatedStaff);
    } else {
        res.status(404);
        throw new Error('Staff member not found');
    }
});

const deleteStaff = asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);
    if (staff) {
        await User.deleteOne({ staffId: staff._id });
        await staff.deleteOne();
        res.json({ message: 'Staff member and associated user removed' });
    } else {
        res.status(404);
        throw new Error('Staff member not found');
    }
});

const bulkCreateStaffs = asyncHandler(async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        res.status(400); throw new Error('Staff data must be a non-empty array.');
    }
    const successfulInserts = []; const failedRecords = [];
    for (const record of records) {
        try {
            const userExists = await User.findOne({ email: record.email });
            if (userExists) { throw new Error(`User with email ${record.email} already exists.`); }
            const staff = new Staff({ name: record.name, email: record.email, jobTitle: record.jobTitle, contact: record.contact, address: record.address, qualifications: record.qualifications, baseSalary: record.baseSalary, });
            const createdStaff = await staff.save();
            await User.create({ name: createdStaff.name, email: createdStaff.email, password: record.password, role: createdStaff.jobTitle, staffId: createdStaff._id, });
            successfulInserts.push(createdStaff);
        } catch (error) {
            failedRecords.push({ record, error: error.message });
        }
    }
    res.status(207).json({ success: true, message: 'Bulk staff import process finished.', insertedCount: successfulInserts.length, failedCount: failedRecords.length, failures: failedRecords, });
});

const bulkDeleteStaffs = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400); throw new Error('An array of staff IDs is required.');
    }
    await User.deleteMany({ staffId: { $in: ids } });
    const result = await Staff.deleteMany({ _id: { $in: ids } });
    if (result.deletedCount === 0) {
        res.status(404); throw new Error('No matching staff members found to delete.');
    }
    res.status(200).json({ success: true, message: `Successfully deleted ${result.deletedCount} staff members and their associated user accounts.` });
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