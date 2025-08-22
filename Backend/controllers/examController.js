// controllers/examController.js
const asyncHandler = require('express-async-handler');
const Exam = require('../models/exam.model.js');

// --- THIS FUNCTION IS NOW MUCH MORE POWERFUL ---
const getExams = asyncHandler(async (req, res) => {
    // This deep populate gets all the info we need for the frontend in one query
    const exams = await Exam.find({})
        .populate('teacherId', 'name')
        .populate('subjectId', 'name')
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
        });
    res.json(exams);
});

// --- THIS FUNCTION IS UPDATED FOR THE NEW FIELDS ---
const createExam = asyncHandler(async (req, res) => {
    // We now expect sectionId and time
    const { name, sectionId, subjectId, teacherId, date, time, maxMarks } = req.body;
    if (!name || !sectionId || !subjectId || !teacherId || !date || !time || !maxMarks) {
        res.status(400);
        throw new Error('Missing required fields for the exam schedule.');
    }
    const exam = await Exam.create({ name, sectionId, subjectId, teacherId, date, time, maxMarks });
    res.status(201).json(exam);
});

const updateExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (exam) {
        // This correctly handles updating the teacherId if it's provided.
        Object.assign(exam, req.body);
        const updatedExam = await exam.save();
        res.json(updatedExam);
    } else {
        res.status(404);
        throw new Error('Exam not found');
    }
});

const deleteExam = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.id);
    if (exam) {
        // Also delete associated results
        const Result = require('../models/result.model.js');
        await Result.deleteMany({ examId: exam._id });
        
        await exam.deleteOne();
        res.json({ message: 'Exam and associated results removed' });
    } else {
        res.status(404);
        throw new Error('Exam not found');
    }
});

module.exports = {
    getExams,
    createExam,
    updateExam,
    deleteExam,
};