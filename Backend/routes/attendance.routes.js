// routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const {
    getAttendanceForSectionAndDate,
    getSectionAttendanceReport,
    getStudentAttendanceReport,
    saveAttendance
} = require('../controllers/attendanceController');

// Route for saving attendance
router.post('/', saveAttendance);

// Route for fetching a single day's attendance sheet for marking
router.get('/:sectionId/:date', getAttendanceForSectionAndDate);

// Routes for generating reports
router.get('/report/section/:sectionId', getSectionAttendanceReport);
router.get('/report/student/:studentId', getStudentAttendanceReport);

module.exports = router;