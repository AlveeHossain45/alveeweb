// routes/student.routes.js
const express = require('express');
const router = express.Router();
const {
    getStudents,
    createStudent,
    getStudentById,
    updateStudent,
    deleteStudent,
    bulkCreateStudents,
    bulkDeleteStudents
} = require('../controllers/studentController');

router.route('/')
    .get(getStudents)
    .post(createStudent);

// --- MODIFIED SECTION ---
// Route for bulk CREATION
router.post('/bulk', bulkCreateStudents);

// NEW: Add this bulk DELETE route
router.delete('/bulk', bulkDeleteStudents);
// ------------------------

router.route('/:id')
    .get(getStudentById)
    .put(updateStudent)
    .delete(deleteStudent);

module.exports = router;