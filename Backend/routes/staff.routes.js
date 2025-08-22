// routes/staff.routes.js
const express = require('express');
const router = express.Router();
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
    .post(createStaff);

router.post('/bulk', bulkCreateStaffs);
router.delete('/bulk', bulkDeleteStaffs);

router.route('/:id')
    .get(getStaffById)
    .put(updateStaff)
    .delete(deleteStaff);

module.exports = router;