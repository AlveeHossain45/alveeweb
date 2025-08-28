// controllers/teacherController.js
const asyncHandler = require('express-async-handler');
const Teacher = require('../models/teacher.model.js');
const User = require('../models/user.model.js');
const Department = require('../models/department.model.js');
const sharp = require('sharp');
const { put } = require('@vercel/blob'); // Vercel Blob SDK

// --- ANALYSIS ---
// The same fix is applied here: the old `path` and `fs` logic is removed.

const getTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find({}).populate('departmentId', 'name');
    res.json(teachers);
});

const getTeacherById = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (teacher) {
        res.json(teacher);
    } else {
        res.status(404);
        throw new Error('Teacher not found');
    }
});

const createTeacher = asyncHandler(async (req, res) => {
    const teacher = new Teacher({
        name: req.body.name,
        email: req.body.email,
        departmentId: req.body.departmentId,
        contact: req.body.contact,
        address: req.body.address,
        qualifications: req.body.qualifications,
        baseSalary: req.body.baseSalary,
        joiningDate: req.body.joiningDate || new Date(),
    });
    const createdTeacher = await teacher.save();
    res.status(201).json(createdTeacher);
});

const updateTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (teacher) {
        Object.assign(teacher, req.body);

        if (req.file) {
            const filename = `${Date.now()}-${teacher._id}.webp`;
            const imageBuffer = await sharp(req.file.buffer)
                .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
                .toFormat('webp')
                .webp({ quality: 80 })
                .toBuffer();
            const blob = await put(filename, imageBuffer, { access: 'public' });
            teacher.profileImage = blob.url;
        }

        const updatedTeacher = await teacher.save();
        const user = await User.findOne({ teacherId: teacher._id });
        if (user) {
            user.name = updatedTeacher.name;
            user.email = updatedTeacher.email;
            if (teacher.profileImage) {
                user.profileImage = teacher.profileImage;
            }
            await user.save();
        }
        res.json(updatedTeacher);
    } else {
        res.status(404);
        throw new Error('Teacher not found');
    }
});

const deleteTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (teacher) {
        await User.deleteOne({ teacherId: teacher._id });
        await teacher.deleteOne();
        res.json({ message: 'Teacher and associated user removed' });
    } else {
        res.status(404);
        throw new Error('Teacher not found');
    }
});

const bulkCreateTeachers = asyncHandler(async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        res.status(400); throw new Error('Teacher data must be a non-empty array.');
    }
    const allDepartments = await Department.find({});
    const departmentMap = new Map(allDepartments.map(dept => [dept.name, dept._id]));
    const successfulInserts = []; const failedRecords = [];
    for (const record of records) {
        try {
            const userExists = await User.findOne({ email: record.email });
            if (userExists) { throw new Error(`User with email ${record.email} already exists.`); }
            let departmentId = null;
            if (record.departmentName && record.departmentName.trim() !== '') {
                departmentId = departmentMap.get(record.departmentName);
                if (!departmentId) { throw new Error(`Department named "${record.departmentName}" was not found.`); }
            }
            const teacher = new Teacher({ name: record.name, email: record.email, departmentId: departmentId, contact: record.contact, address: record.address, qualifications: record.qualifications, baseSalary: record.baseSalary, profileImage: record.profileImage, joiningDate: record.joiningDate, bloodGroup: record.bloodGroup });
            const createdTeacher = await teacher.save();
            await User.create({ name: createdTeacher.name, email: createdTeacher.email, password: record.password, role: 'Teacher', teacherId: createdTeacher._id, });
            successfulInserts.push(createdTeacher);
        } catch (error) {
            failedRecords.push({ record, error: error.message });
        }
    }
    res.status(207).json({ success: true, message: 'Bulk teacher import process finished.', insertedCount: successfulInserts.length, failedCount: failedRecords.length, failures: failedRecords, });
});

const bulkDeleteTeachers = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400); throw new Error('An array of teacher IDs is required.');
    }
    await User.deleteMany({ teacherId: { $in: ids } });
    const result = await Teacher.deleteMany({ _id: { $in: ids } });
    if (result.deletedCount === 0) {
        res.status(404); throw new Error('No matching teachers found to delete.');
    }
    res.status(200).json({ success: true, message: `Successfully deleted ${result.deletedCount} teachers and their associated user accounts.` });
});

module.exports = {
    getTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    bulkCreateTeachers,
    bulkDeleteTeachers
};