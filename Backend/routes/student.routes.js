// in routes/student.routes.js

const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware'); // Middleware is already imported

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
    // --- THIS IS THE FIX ---
    // We add the middleware here to allow the create route to handle file uploads.
    .post(upload.single('profileImage'), createStudent);

router.post('/bulk', bulkCreateStudents);
router.delete('/bulk', bulkDeleteStudents);

router.route('/:id')
    .get(getStudentById)
    .put(upload.single('profileImage'), updateStudent) // This was already correct
    .delete(deleteStudent);

module.exports = router;