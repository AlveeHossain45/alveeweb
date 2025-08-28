// in routes/teacher.routes.js

const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware'); // Middleware is already imported

const {
    getTeachers,
    createTeacher,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
    bulkCreateTeachers,
    bulkDeleteTeachers
} = require('../controllers/teacherController');

router.route('/')
    .get(getTeachers)
    // --- THIS IS THE FIX ---
    .post(upload.single('profileImage'), createTeacher);

router.post('/bulk', bulkCreateTeachers);
router.delete('/bulk', bulkDeleteTeachers);

router.route('/:id')
    .get(getTeacherById)
    .put(upload.single('profileImage'), updateTeacher) // This was already correct
    .delete(deleteTeacher);

module.exports = router;