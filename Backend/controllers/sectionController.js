// controllers/sectionController.js
const asyncHandler = require('express-async-handler');
const Section = require('../models/section.model.js');
const mongoose = require('mongoose');

// --- THIS IS THE CORRECTED FUNCTION ---
const getSections = asyncHandler(async (req, res) => {
    // We now deeply populate the department within the subject.
    const sections = await Section.find({})
        .populate({
            path: 'subjectId',
            select: 'name departmentId',
            populate: {
                path: 'departmentId',
                select: 'name'
            }
        })
        .populate('classTeacherId', 'name');
    res.json(sections);
});

const createSection = asyncHandler(async (req, res) => {
    const { name, subjectId, classTeacherId, academicYear, roomNumber } = req.body;
    if (!name || !subjectId) {
        res.status(400);
        throw new Error('Section Name and Subject are required');
    }
    const existingSection = await Section.findOne({ name, subjectId });
    if (existingSection) {
        res.status(409);
        throw new Error(`A section named "${name}" already exists for this subject.`);
    }
    const sectionPayload = { name, subjectId, academicYear, roomNumber };
    if (classTeacherId && mongoose.Types.ObjectId.isValid(classTeacherId)) {
        sectionPayload.classTeacherId = classTeacherId;
    }
    const newSection = await Section.create(sectionPayload);
    res.status(201).json(newSection);
});

const updateSection = asyncHandler(async (req, res) => {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!section) {
        res.status(404);
        throw new Error('Section not found');
    }
    res.json(section);
});

const deleteSection = asyncHandler(async (req, res) => {
    const section = await Section.findById(req.params.id);
    if (section) {
        await section.deleteOne();
        res.json({ message: 'Section removed' });
    } else {
        res.status(404);
        throw new Error('Section not found');
    }
});

module.exports = { 
    getSections, 
    createSection, 
    updateSection, 
    deleteSection,
};