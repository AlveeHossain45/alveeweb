// routes/timetable.routes.js
const express = require('express');
const router = express.Router();
const { getTimetable, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = require('../controllers/timetableController');

router.route('/')
    .get(getTimetable)
    .post(createTimetableEntry);

router.route('/:id')
    .put(updateTimetableEntry)
    .delete(deleteTimetableEntry);

module.exports = router;