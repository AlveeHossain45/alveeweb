// controllers/attendanceController.js
const asyncHandler = require('express-async-handler');
const Attendance = require('../models/attendance.model.js');
const mongoose = require('mongoose');

// @desc    Get attendance for a specific section on a specific date
// @route   GET /attendance/:sectionId/:date
// @access  Private
const getAttendanceForSectionAndDate = asyncHandler(async (req, res) => {
    const { sectionId, date } = req.params;
    const records = await Attendance.find({ sectionId: sectionId, date: new Date(date) });
    const attendanceMap = records.reduce((map, record) => {
        map[record.studentId] = record.status;
        return map;
    }, {});
    res.json(attendanceMap);
});

// @desc    Get attendance report for a section within a date range
// @route   GET /attendance/report/section/:sectionId
// @access  Private
const getSectionAttendanceReport = asyncHandler(async (req, res) => {
    const { sectionId } = req.params;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Start date and end date are required for reports.');
    }
    const records = await Attendance.find({
        sectionId: sectionId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    })
    .populate('studentId', 'name rollNo')
    .populate('markedBy', 'name');
    res.json(records);
});

// @desc    Get attendance report for a single student
// @route   GET /attendance/report/student/:studentId
// @access  Private
const getStudentAttendanceReport = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const records = await Attendance.find({ studentId: studentId })
        .populate('sectionId', 'name')
        .populate({
            path: 'sectionId',
            populate: { path: 'subjectId', select: 'name' }
         })
        .sort({ date: -1 });
    res.json(records);
});

// @desc    Save/update attendance for a section
// @route   POST /attendance
// @access  Private (Teacher/Admin)
const saveAttendance = asyncHandler(async (req, res) => {
    const { date, sectionId, records, markedBy } = req.body;
    if (!date || !sectionId || !records || !markedBy) {
        res.status(400);
        throw new Error('Date, Section ID, records, and marker ID are required.');
    }
    const bulkOps = Object.keys(records).map(studentId => ({
        updateOne: {
            filter: { date: new Date(date), sectionId: sectionId, studentId: studentId },
            update: {
                $set: {
                    status: records[studentId],
                    markedBy: markedBy,
                    date: new Date(date),
                    sectionId: sectionId,
                    studentId: studentId
                }
            },
            upsert: true
        }
    }));
    if (bulkOps.length > 0) {
        await Attendance.bulkWrite(bulkOps);
    }
    res.status(200).json({ success: true, message: 'Attendance saved successfully' });
});

module.exports = {
    getAttendanceForSectionAndDate,
    getSectionAttendanceReport,
    getStudentAttendanceReport,
    saveAttendance,
};