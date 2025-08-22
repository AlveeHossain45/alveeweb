// routes/result.routes.js
const express = require('express');
const router = express.Router();
const { getAllResults, getResultsForExam, saveResults, deleteResult } = require('../controllers/resultController');

router.get('/', getAllResults);
router.get('/exam/:examId', getResultsForExam);
router.post('/exam/:examId', saveResults);
router.delete('/:id', deleteResult);

module.exports = router;