// controllers/studentController.js
const asyncHandler = require('express-async-handler');
const Student = require('../models/student.model.js');
const Section = require('../models/section.model.js');
const User = require('../models/user.model.js');

// --- THIS IS THE CORRECTED AND DEEPLY NESTED POPULATE LOGIC ---
const populateStudentDetails = (query) => {
    return query.populate({
        path: 'sectionId',      // 1. From Student, populate the Section
        select: 'name subjectId', // Select the fields we need from the Section
        populate: {
            path: 'subjectId',  // 2. From the Section, populate the Subject
            select: 'name departmentId', // Select the fields we need from the Subject
            populate: {
                path: 'departmentId', // 3. From the Subject, populate the Department
                select: 'name'     // Finally, get the Department's name
            }
        }
    });
};

const getStudents = asyncHandler(async (req, res) => {
    const students = await populateStudentDetails(Student.find({}));
    res.json(students);
});

const getStudentById = asyncHandler(async (req, res) => {
    const student = await populateStudentDetails(Student.findById(req.params.id));
    if (student) {
        res.json(student);
    } else {
        res.status(404);
        throw new Error('Student not found');
    }
});

// @desc    Create a new student profile
// @route   POST /students
// @access  Private (Admin)
const createStudent = asyncHandler(async (req, res) => {
    // The frontend first creates a student, then creates a user.
    const student = new Student({
        name: req.body.name,
        email: req.body.email,
        rollNo: req.body.rollNo,
        dateOfBirth: req.body.dateOfBirth,
        sectionId: req.body.sectionId, 
        gender: req.body.gender,
        bloodGroup: req.body.bloodGroup,
        guardianName: req.body.guardianName,
        contact: req.body.contact,
        address: req.body.address,
        enrollmentDate: req.body.enrollmentDate || new Date(),
    });

    const createdStudent = await student.save();
    res.status(201).json(createdStudent);
});

// @desc    Update a student's profile
// @route   PUT /students/:id
// @access  Private (Admin or authorized)
const updateStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);

    if (student) {
        // Update all fields provided in the request body
        Object.assign(student, req.body);
        
        const updatedStudent = await student.save();

        // Also update the associated user record's name and email if they changed
        const user = await User.findOne({ studentId: student._id });
        if(user && (user.name !== updatedStudent.name || user.email !== updatedStudent.email)) {
            user.name = updatedStudent.name;
            user.email = updatedStudent.email;
            await user.save();
        }

        res.json(updatedStudent);    
    } else {
        res.status(404);
        throw new Error('Student not found');
    }
});

// @desc    Delete a student profile
// @route   DELETE /students/:id
// @access  Private (Admin)
const deleteStudent = asyncHandler(async (req, res) => {
    const student = await Student.findById(req.params.id);

    if (student) {
        // Also delete the associated user login
        await User.deleteOne({ studentId: student._id });
        
        await student.deleteOne();
        res.json({ message: 'Student and associated user removed' });
    } else {
        res.status(404);
        throw new Error('Student not found');
    }
});
// In controllers/studentController.js, replace the existing bulkCreateStudents function
const bulkCreateStudents = asyncHandler(async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        res.status(400);
        throw new Error('Student data must be a non-empty array.');
    }

    // --- NEW: A "smarter" approach ---
    // Step 1: Fetch all sections from the database ONCE.
    const allSections = await Section.find({});
    
    // Step 2: Create a mapping from the section name (e.g., "Section A") to its actual database ID.
    // This allows for a very fast lookup inside the loop.
    const sectionMap = new Map(allSections.map(section => [section.name, section._id]));

    const successfulInserts = [];
    const failedRecords = [];

    for (const record of records) {
        try {
            // Step 3: Check for existing user to prevent duplicates.
            const userExists = await User.findOne({ email: record.email });
            if (userExists) {
                throw new Error(`User with email ${record.email} already exists.`);
            }

            // --- THIS IS THE KEY CHANGE ---
            // Step 4: Look up the section's database ID using the name from the JSON file.
            // The JSON should contain something like "sectionName": "Section A".
            const sectionId = sectionMap.get(record.sectionName); // We will use 'sectionName' in our JSON
            
            // If a section is provided but not found in the database, it's an error.
            if (record.sectionName && !sectionId) {
                throw new Error(`Section with name "${record.sectionName}" was not found.`);
            }

            // Step 5: Create the student profile with the CORRECT database ID.
            const student = new Student({
                name: record.name,
                email: record.email,
                rollNo: record.rollNo,
                sectionId: sectionId, // Use the ID we found, which could be null if not provided
                dateOfBirth: record.dateOfBirth,
                gender: record.gender,
                contact: record.contact,
                address: record.address,
                guardianName: record.guardianName,
                profileImage: record.profileImage,
                enrollmentDate: record.enrollmentDate,
                bloodGroup: record.bloodGroup,
            });
            const createdStudent = await student.save();

            // Step 6: Create the associated User account for login.
            await User.create({
                name: createdStudent.name,
                email: createdStudent.email,
                password: record.password,
                role: 'Student',
                studentId: createdStudent._id,
            });

            successfulInserts.push(createdStudent);

        } catch (error) {
            failedRecords.push({ record, error: error.message });
        }
    }

    // Step 7: Send a detailed report back.
    res.status(207).json({
        success: true,
        message: 'Bulk student import process finished.',
        insertedCount: successfulInserts.length,
        failedCount: failedRecords.length,
        failures: failedRecords,
    });
});


const bulkDeleteStudents = asyncHandler(async (req, res) => {
    const { ids } = req.body; // Expects an array of student IDs

    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('An array of student IDs is required.');
    }

    // IMPORTANT: Also delete the associated user accounts
    await User.deleteMany({ studentId: { $in: ids } });

    // Now delete the student profiles
    const result = await Student.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
        res.status(404);
        throw new Error('No matching students found to delete.');
    }

    res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} students and their associated user accounts.`
    });
});


module.exports = {
    getStudents,
    getStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    bulkCreateStudents,
    bulkDeleteStudents
};