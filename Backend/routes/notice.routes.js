// routes/notice.routes.js
const express = require('express');
const router = express.Router();
const { getNotices, createNotice, deleteNotice, reactToNotice } = require('../controllers/noticeController');

router.route('/')
    .get(getNotices)
    .post(createNotice);

// --- THIS IS THE NEW ROUTE FOR REACTIONS ---
// It correctly links the URL to the controller function.
router.route('/:noticeId/react')
    .post(reactToNotice);

router.route('/:id')
    .delete(deleteNotice);

module.exports = router;