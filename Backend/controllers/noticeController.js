const asyncHandler = require('express-async-handler');
const Notice = require('../models/notice.model.js');

// @desc    Get all notices
// @route   GET /notices
// @access  Private
const getNotices = asyncHandler(async (req, res) => {
    const notices = await Notice.find({}).sort({ date: -1 });
    res.json(notices);
});


// @desc    Create a new notice or message
// @route   POST /notices
// @access  Private
const createNotice = asyncHandler(async (req, res) => {
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


// @desc    Delete a notice
// @route   DELETE /notices/:id
// @access  Private
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


// --- THIS IS THE FINALIZED REACTION FUNCTION ---
// @desc    Add, update, or remove a reaction from a notice
// @route   POST /notices/:noticeId/react
// @access  Private
const reactToNotice = asyncHandler(async (req, res) => {
    const { noticeId } = req.params;
    const { userId, reactionType } = req.body; // reactionType will be an emoji like "👍"

    if (!userId || !reactionType) {
        return res.status(400).json({ message: 'User ID and reaction type are required.' });
    }

    const notice = await Notice.findById(noticeId);
    if (!notice) {
        return res.status(404).json({ message: 'Notice not found.' });
    }

    // Find if the user has already reacted to this notice.
    const existingReactionIndex = notice.reactions.findIndex(r => r.userId.toString() === userId);

    if (existingReactionIndex > -1) {
        // CASE 1: The user has already reacted.
        const existingReaction = notice.reactions[existingReactionIndex];
        
        if (existingReaction.type === reactionType) {
            // Sub-Case A: They clicked the SAME emoji again. We remove their reaction (toggle off).
            notice.reactions.splice(existingReactionIndex, 1);
        } else {
            // Sub-Case B: They clicked a DIFFERENT emoji. We update their reaction to the new one.
            existingReaction.type = reactionType;
        }
    } else {
        // CASE 2: The user is reacting for the first time. Add the new reaction to the array.
        notice.reactions.push({ userId, type: reactionType });
    }

    // Save the changes to the notice document in the database.
    const updatedNotice = await notice.save();
    
    // Send the fully updated notice back to the frontend so the UI can refresh.
    res.json(updatedNotice);
});


module.exports = {
    getNotices,
    createNotice,
    deleteNotice,
    reactToNotice // Export the new function
};