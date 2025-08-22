// controllers/timetableController.js
const asyncHandler = require('express-async-handler');
const Timetable = require('../models/timetable.model.js');
const mongoose = require('mongoose'); // <-- Make sure mongoose is imported

// @desc    Get all timetable entries
// @route   GET /timetable
// @access  Private
const getTimetable = asyncHandler(async (req, res) => {
    const timetable = await Timetable.find({})
        // --- IMPROVEMENT: Populate all necessary data for the frontend ---
        .populate({
            path: 'sectionId',
            select: 'name subjectId',
            populate: {
                path: 'subjectId',
                select: 'name departmentId',
                populate: {
                    path: 'departmentId',
                    select: 'name'
                }
            }
        })
        .populate('subjectId', 'name')
        .populate('teacherId', 'name');
    res.json(timetable);
});

// @desc    Create a new timetable entry
// @route   POST /timetable
// @access  Private (Admin)
// --- THIS IS THE CORRECTED FUNCTION ---
const createTimetableEntry = asyncHandler(async (req, res) => {
    const { sectionId, subjectId, teacherId, dayOfWeek, startTime, endTime, period } = req.body;

    // More robust validation to prevent bad data from being saved
    if (!sectionId || !mongoose.Types.ObjectId.isValid(sectionId) ||
        !subjectId || !mongoose.Types.ObjectId.isValid(subjectId) ||
        !teacherId || !mongoose.Types.ObjectId.isValid(teacherId) ||
        !dayOfWeek || !startTime || !endTime) {
        res.status(400);
        throw new Error('A valid Section, Subject, Teacher, Day, and Time are all required.');
    }

    const entry = await Timetable.create({ 
        sectionId, 
        subjectId, 
        teacherId, 
        dayOfWeek, 
        startTime, 
        endTime, 
        period 
    });

    // Populate the newly created entry before sending it back
    const populatedEntry = await Timetable.findById(entry._id)
        .populate('sectionId', 'name')
        .populate('subjectId', 'name')
        .populate('teacherId', 'name');
        
    res.status(201).json(populatedEntry);
});

// @desc    Update a timetable entry
// @route   PUT /timetable/:id
// @access  Private (Admin)
const updateTimetableEntry = asyncHandler(async (req, res) => {
    const entry = await Timetable.findById(req.params.id);
    if (entry) {
        Object.assign(entry, req.body);
        const updatedEntry = await entry.save();
        res.json(updatedEntry);
    } else {
        res.status(404);
        throw new Error('Timetable entry not found');
    }
});

// @desc    Delete a timetable entry
// @route   DELETE /timetable/:id
// @access  Private (Admin)
const deleteTimetableEntry = asyncHandler(async (req, res) => {
    const entry = await Timetable.findById(req.params.id);
    if (entry) {
        await entry.deleteOne();
        res.json({ message: 'Timetable entry removed' });
    } else {
        res.status(404);
        throw new Error('Timetable entry not found');
    }
});

module.exports = {
    getTimetable,
    createTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
};