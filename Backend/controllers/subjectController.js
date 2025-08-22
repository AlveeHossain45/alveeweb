// controllers/subjectController.js
const asyncHandler = require('express-async-handler');
const Subject = require('../models/subject.model.js');
const Section = require('../models/section.model.js');

const getSubjects = asyncHandler(async (req, res) => {
    // Populate the department name for easier display on the frontend
    const subjects = await Subject.find({}).populate('departmentId', 'name');
    res.json(subjects);
});

const createSubject = asyncHandler(async (req, res) => {
    // --- CHANGED: Now requires departmentId ---
    const { name, departmentId } = req.body;
    if (!name || !departmentId) {
        res.status(400);
        throw new Error('Subject name and Department are required');
    }

    // Check for duplicates within the same department
    const existingSubject = await Subject.findOne({ name, departmentId });
    if (existingSubject) {
        res.status(409); // Conflict
        throw new Error(`Subject "${name}" already exists in this department.`);
    }

    const subject = await Subject.create({ name, departmentId });
    res.status(201).json(subject);
});

const updateSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.findById(req.params.id);
    if (subject) {
        subject.name = req.body.name || subject.name;
        // Optionally allow changing department, though less common
        subject.departmentId = req.body.departmentId || subject.departmentId;
        const updatedSubject = await subject.save();
        res.json(updatedSubject);
    } else {
        res.status(404);
        throw new Error('Subject not found');
    }
});

const deleteSubject = asyncHandler(async (req, res) => {
    const subject = await Subject.findById(req.params.id);
    if (subject) {
        // --- NEW: Also delete all sections that belong to this subject ---
        await Section.deleteMany({ subjectId: subject._id });
        await subject.deleteOne();
        res.json({ message: 'Subject and all its sections have been removed' });
    } else {
        res.status(404);
        throw new Error('Subject not found');
    }
});

module.exports = {
    getSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
};