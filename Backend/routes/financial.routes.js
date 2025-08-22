// routes/financial.routes.js
const express = require('express');
const router = express.Router();

// --- DESTRUCTURE ALL REQUIRED CONTROLLER FUNCTIONS ---
const { getFees, createFee, updateFee, deleteFee, generateMonthlyFees, bulkDeleteFees } = require('../controllers/feeController');
const { getSalaries, createSalary, updateSalary, deleteSalary, processSalaries } = require('../controllers/salaryController');
const { getExpenses, createExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');

// --- Fee Routes ---
router.get('/fees', getFees);
router.post('/fees', createFee);
router.post('/fees/generate', generateMonthlyFees);

// CRITICAL: The specific '/bulk' route must be defined BEFORE the generic '/:id' route.
router.delete('/fees/bulk', bulkDeleteFees);

router.put('/fees/:id', updateFee);
router.delete('/fees/:id', deleteFee);

// --- Salary Routes ---
router.route('/salaries')
    .get(getSalaries)
    .post(createSalary);
router.post('/salaries/process', processSalaries);
router.route('/salaries/:id')
    .put(updateSalary)
    .delete(deleteSalary);

// --- Expense Routes ---
router.route('/expenses')
    .get(getExpenses)
    .post(createExpense);
router.route('/expenses/:id')
    .put(updateExpense)
    .delete(deleteExpense);

module.exports = router;