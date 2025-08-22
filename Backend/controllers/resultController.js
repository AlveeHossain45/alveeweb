const asyncHandler = require('express-async-handler');
const Result = require('../models/result.model.js');

// @desc    Get all results (for admin overview)
// @route   GET /results
// @access  Private
const getAllResults = asyncHandler(async (req, res) => {
    const results = await Result.find({})
        .populate('studentId', 'name')
        .populate('examId');
    res.json(results);
});

// @desc    Get all results for a specific exam
// @route   GET /results/exam/:examId
// @access  Private (Teacher/Admin)
const getResultsForExam = asyncHandler(async (req, res) => {
    const results = await Result.find({ examId: req.params.examId });
    res.json(results);
});

// @desc    Save/update results for an exam in bulk
// @route   POST /results/exam/:examId
// @access  Private (Teacher/Admin)
const saveResults = asyncHandler(async (req, res) => {
    const { examId } = req.params;
    const resultsData = req.body; // Expects an array of { studentId, marks }

    if (!Array.isArray(resultsData)) {
        res.status(400);
        throw new Error('Expected an array of results data');
    }

    const bulkOps = resultsData.map(result => ({
        updateOne: {
            filter: { examId: examId, studentId: result.studentId },
            update: {
                $set: {
                    marks: result.marks,
                    // examId and studentId are in the filter, so they are set on insert
                    examId: examId, 
                    studentId: result.studentId
                }
            },
            upsert: true, // This will create a new document if one doesn't exist
        },
    }));

    if (bulkOps.length > 0) {
        const result = await Result.bulkWrite(bulkOps);
        res.status(200).json({ success: true, message: 'Results saved successfully', result });
    } else {
        res.status(200).json({ success: true, message: 'No results data to save' });
    }
});

// @desc    Delete a single result entry
// @route   DELETE /results/:id
// @access  Private (Admin/Teacher)
const deleteResult = asyncHandler(async (req, res) => {
    const result = await Result.findById(req.params.id);
    if(result){
        await result.deleteOne();
        res.json({ success: true, message: 'Result entry deleted' });
    } else {
        res.status(404);
        throw new Error('Result entry not found');
    }
});


module.exports = {
    getAllResults,
    getResultsForExam,
    saveResults,
    deleteResult,
};