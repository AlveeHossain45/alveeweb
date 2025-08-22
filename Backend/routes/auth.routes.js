// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { loginUser } = require('../controllers/authController');

// @route   POST /
// @desc    Authenticate user and get token
// @access  Public
router.post('/', loginUser);

module.exports = router;