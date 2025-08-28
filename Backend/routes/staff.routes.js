// in routes/staff.routes.js

const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware'); // Middleware is already imported

const {
    getStaffs,
    createStaff,
    getStaffById,
    updateStaff,
    deleteStaff,
    bulkCreateStaffs,
    bulkDeleteStaffs
} = require('../controllers/staffController');

router.route('/')
    .get(getStaffs)
    // --- THIS IS THE FIX ---
    .post(upload.single('profileImage'), createStaff);

router.post('/bulk', bulkCreateStaffs);
router.delete('/bulk', bulkDeleteStaffs);

router.route('/:id')
    .get(getStaffById)
    .put(upload.single('profileImage'), updateStaff) // This was already correct
    .delete(deleteStaff);

module.exports = router;