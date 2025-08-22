// routes/department.routes.js
const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment, updateDepartment, deleteDepartment, bulkDeleteDepartments  } = require('../controllers/departmentController');

router.route('/')
    .get(getDepartments)
    .post(createDepartment);

router.delete('/bulk', bulkDeleteDepartments);


router.route('/:id')
    .put(updateDepartment)
    .delete(deleteDepartment);

module.exports = router;