// routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
    getUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    bulkCreateUsers,
    bulkDeleteUsers
} = require('../controllers/userController');

router.route('/')
    .get(getUsers)
    .post(createUser);

// --- MODIFIED SECTION ---
// Route for bulk CREATION
router.post('/bulk', bulkCreateUsers);

// NEW: Add this bulk DELETE route
router.delete('/bulk', bulkDeleteUsers);
// ------------------------

router.route('/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser);

module.exports = router;