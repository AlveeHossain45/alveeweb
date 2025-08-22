// routes/section.routes.js
const express = require('express');
const router = express.Router();
const { 
    getSections, 
    createSection, 
    updateSection, 
    deleteSection,
} = require('../controllers/sectionController');

router.route('/')
    .get(getSections)
    .post(createSection);

// --- REMOVED: The subjects sub-route is gone ---

router.route('/:id')
    .put(updateSection)
    .delete(deleteSection);

module.exports = router;