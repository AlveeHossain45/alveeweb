const asyncHandler = require('express-async-handler');
const Teacher = require('../models/teacher.model.js');
const User = require('../models/user.model.js');
const Department = require('../models/department.model.js');

// @desc    Get all teachers
// @route   GET /teachers
// @access  Private
const getTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find({}).populate('departmentId', 'name');
    res.json(teachers);
});

// @desc    Get a single teacher by ID
// @route   GET /teachers/:id
// @access  Private
const getTeacherById = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);
    if (teacher) {
        res.json(teacher);
    } else {
        res.status(404);
        throw new Error('Teacher not found');
    }
});

// @desc    Create a new teacher profile
// @route   POST /teachers
// @access  Private (Admin)
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

// @desc    Update a teacher's profile
// @route   PUT /teachers/:id
// @access  Private (Admin or authorized)
const updateTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);

    if (teacher) {
        Object.assign(teacher, req.body);
        const updatedTeacher = await teacher.save();

        // Also update the associated user record's name and email if they changed
const user = await User.findOne({ teacherId: teacher._id });
if(user && (user.name !== updatedTeacher.name || user.email !== updatedTeacher.email)) {
    user.name = updatedTeacher.name;
    user.email = updatedTeacher.email;
    await user.save();
}

res.json(updatedTeacher);
    } else {
        res.status(404);
        throw new Error('Teacher not found');
    }
});

// @desc    Delete a teacher profile
// @route   DELETE /teachers/:id
// @access  Private (Admin)
const deleteTeacher = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id);

if (teacher) {
    // Also delete the associated user login
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
        res.status(400);
        throw new Error('Teacher data must be a non-empty array.');
    }

    const allDepartments = await Department.find({});
    const departmentMap = new Map(allDepartments.map(dept => [dept.name, dept._id]));

    const successfulInserts = [];
    const failedRecords = [];

    for (const record of records) {
        try {
            const userExists = await User.findOne({ email: record.email });
            if (userExists) {
                throw new Error(`User with email ${record.email} already exists.`);
            }

            // --- THIS IS THE KEY MODIFICATION ---
            let departmentId = null; // Default to null (no department)

            // Check if a departmentName was provided in the JSON record and is not empty
            if (record.departmentName && record.departmentName.trim() !== '') {
                // If it was provided, try to find its ID
                departmentId = departmentMap.get(record.departmentName);
                
                // If a name was given but we couldn't find a matching department, it's an error
                if (!departmentId) {
                    throw new Error(`Department named "${record.departmentName}" was not found.`);
                }
            }
            // If departmentName was not provided or was empty, departmentId simply remains null.
            // ------------------------------------

            const teacher = new Teacher({
                name: record.name,
                email: record.email,
                departmentId: departmentId, // Use the ID we found (or null if not provided)
                contact: record.contact,
                address: record.address,
                qualifications: record.qualifications,
                baseSalary: record.baseSalary,
                profileImage: record.profileImage,
                joiningDate: record.joiningDate,
                bloodGroup: record.bloodGroup
            });
            const createdTeacher = await teacher.save();

            await User.create({
                name: createdTeacher.name,
                email: createdTeacher.email,
                password: record.password,
                role: 'Teacher',
                teacherId: createdTeacher._id,
            });

            successfulInserts.push(createdTeacher);

        } catch (error) {
            failedRecords.push({ record, error: error.message });
        }
    }

    res.status(207).json({
        success: true,
        message: 'Bulk teacher import process finished.',
        insertedCount: successfulInserts.length,
        failedCount: failedRecords.length,
        failures: failedRecords,
    });
});


const bulkDeleteTeachers = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('An array of teacher IDs is required.');
    }

    // Also delete the associated user accounts
    await User.deleteMany({ teacherId: { $in: ids } });

    // Now delete the teacher profiles
    const result = await Teacher.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
        res.status(404);
        throw new Error('No matching teachers found to delete.');
    }

    res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} teachers and their associated user accounts.`
    });
});



module.exports = {
    getTeachers,
    getTeacherById,
    createTeacher,
    updateTeacher,
    deleteTeacher,
   bulkCreateTeachers,
   bulkDeleteTeachers // NEW

};

