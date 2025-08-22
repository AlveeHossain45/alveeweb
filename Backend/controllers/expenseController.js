const asyncHandler = require('express-async-handler');
const Expense = require('../models/expense.model.js');

// @desc    Get all expenses
// @route   GET /expenses
// @access  Private (Admin/Accountant)
const getExpenses = asyncHandler(async (req, res) => {
    const expenses = await Expense.find({}).sort({ date: -1 });
    res.json(expenses);
});

// @desc    Create a new expense
// @route   POST /expenses
// @access  Private (Admin/Accountant)
const createExpense = asyncHandler(async (req, res) => {
    const { date, category, amount, description } = req.body;
    if (!date || !category || !amount) {
        res.status(400);
        throw new Error('Date, category, and amount are required');
    }
    const expense = await Expense.create({ date, category, amount, description });
    res.status(201).json(expense);
});

// @desc    Update an expense
// @route   PUT /expenses/:id
// @access  Private (Admin/Accountant)
const updateExpense = asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id);
    if (expense) {
        Object.assign(expense, req.body);
        const updatedExpense = await expense.save();
        res.json(updatedExpense);
    } else {
        res.status(404);
        throw new Error('Expense record not found');
    }
});

// @desc    Delete an expense
// @route   DELETE /expenses/:id
// @access  Private (Admin)
const deleteExpense = asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id);
    if (expense) {
        // FIX: Use deleteOne() instead of the deprecated remove()
        await expense.deleteOne();
        res.json({ message: 'Expense record removed' });
    } else {
        res.status(404);
        throw new Error('Expense record not found');
    }
});

module.exports = {
    getExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
};