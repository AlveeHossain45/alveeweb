// controllers/salaryController.js
const asyncHandler = require('express-async-handler');
const Salary = require('../models/salary.model.js');
const Teacher = require('../models/teacher.model.js');

// --- THIS IS THE CORRECTED FUNCTION ---
const getSalaries = asyncHandler(async (req, res) => {
    // We now .populate('teacherId', 'name') to automatically include the teacher's name.
    const salaries = await Salary.find({}).populate('teacherId', 'name');
    res.json(salaries);
});

const createSalary = asyncHandler(async (req, res) => {
    // ... (This function is fine, no changes needed)
    const { teacherId, baseSalary, bonus, deductions, netPay, month, status } = req.body;
    if (!teacherId || !netPay || !month) {
        res.status(400);
        throw new Error('Missing required fields for salary record');
    }
    const salary = await Salary.create({ teacherId, baseSalary, bonus, deductions, netPay, month, status: status || 'Pending' });
    res.status(201).json(salary);
});

const updateSalary = asyncHandler(async (req, res) => {
    // ... (This function is fine, no changes needed)
    const salary = await Salary.findById(req.params.id);
    if (salary) {
        salary.status = req.body.status || salary.status;
        salary.paidDate = req.body.paidDate || salary.paidDate;
        if (req.body.status === 'Paid' && !req.body.paidDate) {
            salary.paidDate = new Date();
        }
        const updatedSalary = await salary.save();
        res.json(updatedSalary);
    } else {
        res.status(404);
        throw new Error('Salary record not found');
    }
});

// --- IMPROVEMENT: Changed deprecated .remove() to .deleteOne() ---
const deleteSalary = asyncHandler(async (req, res) => {
    const salary = await Salary.findById(req.params.id);
    if (salary) {
        await salary.deleteOne(); // Use modern deleteOne() method
        res.json({ message: 'Salary record removed' });
    } else {
        res.status(404);
        throw new Error('Salary record not found');
    }
});

const processSalaries = asyncHandler(async (req, res) => {
    // ... (This function is fine, no changes needed)
    const month = req.body.month || new Date().toISOString().slice(0, 7);
    const teachers = await Teacher.find({});
    if (teachers.length === 0) {
        return res.status(200).json({ message: "No teachers to process." });
    }
    const teacherIds = teachers.map(t => t._id);
    const existingSalaries = await Salary.find({ teacherId: { $in: teacherIds }, month: month });
    const existingTeacherIds = new Set(existingSalaries.map(s => s.teacherId.toString()));
    const newSalaryRecords = [];
    for (const teacher of teachers) {
        if (!existingTeacherIds.has(teacher._id.toString())) {
            newSalaryRecords.push({
                teacherId: teacher._id,
                baseSalary: teacher.baseSalary || 0,
                bonus: 0,
                deductions: 0,
                netPay: teacher.baseSalary || 0,
                month: month,
                status: 'Pending'
            });
        }
    }
    if (newSalaryRecords.length > 0) {
        await Salary.insertMany(newSalaryRecords);
    }
    res.status(201).json({ message: `Successfully processed salaries. Generated ${newSalaryRecords.length} new records for ${month}.` });
});

module.exports = {
    getSalaries,
    createSalary,
    updateSalary,
    deleteSalary,
    processSalaries,
};