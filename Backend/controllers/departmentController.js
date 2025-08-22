// controllers/departmentController.js
const asyncHandler = require('express-async-handler');
const Department = require('../models/department.model.js');
const Subject = require('../models/subject.model.js'); // <-- 1. Import Subject
const Section = require('../models/section.model.js'); // <-- 2. Import Section

const getDepartments = asyncHandler(async (req, res) => {
    // No changes needed here
    const departments = await Department.find({});
    res.json(departments);
});

const createDepartment = asyncHandler(async (req, res) => {
    // No changes needed here
    const { name } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Department name is required');
    }
    const department = await Department.create({ name });
    res.status(201).json(department);
});

const updateDepartment = asyncHandler(async (req, res) => {
    // No changes needed here
    const department = await Department.findById(req.params.id);
    if (department) {
        department.name = req.body.name || department.name;
        const updatedDepartment = await department.save();
        res.json(updatedDepartment);
    } else {
        res.status(404);
        throw new Error('Department not found');
    }
});

// --- THIS IS THE CORRECTED AND IMPROVED DELETE FUNCTION ---
const deleteDepartment = asyncHandler(async (req, res) => {
    const department = await Department.findById(req.params.id);
    if (department) {
        // 3. Find all subjects belonging to this department
        const subjectsToDelete = await Subject.find({ departmentId: department._id });
        const subjectIds = subjectsToDelete.map(s => s._id);

        // 4. Delete all sections that belong to those subjects
        await Section.deleteMany({ subjectId: { $in: subjectIds } });
        
        // 5. Delete all the subjects themselves
        await Subject.deleteMany({ departmentId: department._id });

        // 6. Finally, delete the department
        await department.deleteOne();
        
        res.json({ message: 'Department and all its related subjects and sections have been removed' });
    } else {
        res.status(404);
        throw new Error('Department not found');
    }
});


const bulkDeleteDepartments = asyncHandler(async (req, res) => {
    // No changes needed here
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('An array of department IDs is required.');
    }
    const result = await Department.deleteMany({ _id: { $in: ids } });
    if (result.deletedCount === 0) {
        res.status(404);
        throw new Error('No matching departments found to delete.');
    }
    res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} departments.`
    });
});

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    bulkDeleteDepartments
};