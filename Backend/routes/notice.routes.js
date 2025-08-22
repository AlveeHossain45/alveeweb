// routes/notice.routes.js
const express = require('express');
const router = express.Router();
const { getNotices, createNotice, deleteNotice } = require('../controllers/noticeController');

router.route('/')
    .get(getNotices)
    .post(createNotice);

router.route('/:id')
    .delete(deleteNotice);

module.exports = router;