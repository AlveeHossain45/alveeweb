const asyncHandler = require('express-async-handler');
const Notice = require('../models/notice.model.js');

// @desc    Get all notices
// @route   GET /notices
// @access  Private
const getNotices = asyncHandler(async (req, res) => {
    // --- THIS IS THE FIX ---
    // Use .find() to get all documents, not .findOne() which only gets the first one.
    const notices = await Notice.find({}).sort({ date: -1 });
    res.json(notices);
});


// @desc    Create a new notice or message
// @route   POST /notices
// @access  Private (Teachers/Admin)
const createNotice = asyncHandler(async (req, res) => {
    // --- THIS IS THE FIX ---
    // The syntax was 'of req.body', which is incorrect.
    // It has been corrected to '= req.body'.
    const { title, content, target, authorId, type, messageType } = req.body;

    if (!title || !content || !target || !authorId) {
        res.status(400);
        throw new Error('Missing required fields for notice');
    }

    const noticePayload = {
        title,
        content,
        target,
        authorId,
        type: type || 'notice',
        messageType: messageType || 'text',
        date: new Date()
    };

    const notice = await Notice.create(noticePayload);
    res.status(201).json(notice);
});



// @desc    Update a notice (not used in frontend, but good to have)
// @route   PUT /notices/:id
// @access  Private (Author/Admin)
const updateNotice = asyncHandler(async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (notice) {
        Object.assign(notice, req.body);
        const updatedNotice = await notice.save();
        res.json(updatedNotice);
    } else {
        res.status(404);
        throw new Error('Notice not found');
    }
});

// @desc    Delete a notice
// @route   DELETE /notices/:id
// @access  Private (Author/Admin)
const deleteNotice = asyncHandler(async (req, res) => {
    const notice = await Notice.findById(req.params.id);
    if (notice) {
        await notice.deleteOne();
        res.json({ success: true, message: 'Notice removed' });
    } else {
        res.status(404);
        throw new Error('Notice not found');
    }
});

module.exports = {
    getNotices,
    createNotice,
    updateNotice,
    deleteNotice,
};