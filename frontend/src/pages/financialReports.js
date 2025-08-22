// in frontend/src/pages/financialReports.js

import { store } from '../store.js';
import { ui } from '../ui.js';
// --- THIS IS THE FIX: Added the missing helper functions ---
import { exportToCsv, showToast } from '../utils/helpers.js';

export async function renderFinancialReports() {
    // ... rest of the file is correct
    // --- প্রয়োজনীয় ডেটা 미리 লোড করা হচ্ছে ---
    await Promise.all([
        store.refresh('fees'),
        store.refresh('salaries'),
        store.refresh('expenses'),
        store.refresh('students'),
        store.refresh('teachers')
    ]);

    const formatCurrency = (value) => `BDT ${Number(value || 0).toLocaleString()}`;

    // --- পেজের মূল HTML কাঠামো ---
    ui.contentArea.innerHTML = `
        <div class="animate-fade-in space-y-8">
            <!-- পেজের হেডার -->
            <div class="report-page-header">
                <div class="relative z-10">
                    <h2 class="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                        <i class="fas fa-file-invoice-dollar text-indigo-300"></i> Financial Reports
                    </h2>
                    <p class="text-indigo-100/80">Generate, analyze, and export detailed financial statements.</p>
                </div>
            </div>

            <!-- রিপোর্ট জেনারেট করার কার্ডগুলো -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <!-- Fee Collection Report Card -->
                <div class="report-card">
                    <div class="report-card-header">
                        <div class="report-card-icon bg-blue-500/20 text-blue-400"><i class="fas fa-hand-holding-usd"></i></div>
                        <h4 class="report-card-title">Fee Collection Report</h4>
                    </div>
                    <p class="report-card-description">Export a list of fees based on their status and date range.</p>
                    <div class="report-card-filter-area">
                        <select id="fee-status-filter" class="report-card-input">
                            <option value="All">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Unpaid">Unpaid</option>
                        </select>
                        <input type="date" id="fee-start-date" class="report-card-input" title="Start Date">
                        <input type="date" id="fee-end-date" class="report-card-input" title="End Date">
                    </div>
                    <button id="export-fees-btn" class="report-card-button bg-blue-600 hover:bg-blue-700">Export Fees (.csv)</button>
                </div>

                <!-- Salary Payout Report Card -->
                <div class="report-card">
                     <div class="report-card-header">
                        <div class="report-card-icon bg-green-500/20 text-green-400"><i class="fas fa-money-check-alt"></i></div>
                        <h4 class="report-card-title">Salary Payout Report</h4>
                    </div>
                    <p class="report-card-description">Generate a payout report for a specific month.</p>
                    <div class="report-card-filter-area">
                        <input type="month" id="salary-month-filter" class="report-card-input w-full" value="${new Date().toISOString().slice(0, 7)}">
                    </div>
                    <button id="export-salaries-btn" class="report-card-button bg-green-600 hover:bg-green-700">Export Salaries (.csv)</button>
                </div>

                <!-- Expense Report Card -->
                <div class="report-card">
                     <div class="report-card-header">
                        <div class="report-card-icon bg-yellow-500/20 text-yellow-400"><i class="fas fa-receipt"></i></div>
                        <h4 class="report-card-title">Expense Report</h4>
                    </div>
                    <p class="report-card-description">Export a full list of logged expenses within a date range.</p>
                     <div class="report-card-filter-area">
                        <input type="date" id="expense-start-date" class="report-card-input" title="Start Date">
                        <input type="date" id="expense-end-date" class="report-card-input" title="End Date">
                    </div>
                    <button id="export-expenses-btn" class="report-card-button bg-yellow-600 hover:bg-yellow-700">Export Expenses (.csv)</button>
                </div>

                <!-- Profit & Loss Summary Card -->
                <div class="report-card">
                     <div class="report-card-header">
                        <div class="report-card-icon bg-purple-500/20 text-purple-400"><i class="fas fa-chart-pie"></i></div>
                        <h4 class="report-card-title">Profit & Loss Summary</h4>
                    </div>
                    <p class="report-card-description">Generate a summary of total income vs. total outcome.</p>
                     <div class="report-card-filter-area">
                        <input type="date" id="pl-start-date" class="report-card-input" title="Start Date">
                        <input type="date" id="pl-end-date" class="report-card-input" title="End Date">
                    </div>
                    <button id="export-pl-btn" class="report-card-button bg-purple-600 hover:bg-purple-700">Export Summary (.csv)</button>
                </div>

            </div>
        </div>
    `;

    // --- ইভেন্ট হ্যান্ডলারগুলো যুক্ত করা (এই অংশে কোনো পরিবর্তন নেই) ---

    // Fee রিপোর্ট এক্সপোর্ট
    document.getElementById('export-fees-btn').onclick = () => {
        const status = document.getElementById('fee-status-filter').value;
        const startDate = document.getElementById('fee-start-date').value;
        const endDate = document.getElementById('fee-end-date').value;

        let filteredFees = store.get('fees');

        if (status !== 'All') {
            filteredFees = filteredFees.filter(f => f.status === status);
        }
        if (startDate && endDate) {
            filteredFees = filteredFees.filter(f => {
                const itemDate = new Date(f.dueDate);
                return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
            });
        }
        
        if (filteredFees.length === 0) {
            showToast('No fee data found for the selected criteria.', 'info');
            return;
        }

        const headers = ['Student_Name', 'Roll_No', 'Fee_Type', 'Amount', 'Status', 'Due_Date', 'Paid_Date'];
        const rows = filteredFees.map(f => {
            const student = store.getMap('students').get(f.studentId?._id || f.studentId);
            return [
                student?.name || 'N/A',
                student?.rollNo || 'N/A',
                f.feeType,
                f.amount,
                f.status,
                f.dueDate,
                f.paidDate || 'N/A'
            ];
        });
        exportToCsv(`fees_report_${status}.csv`, headers, rows);
    };

    // Salary রিপোর্ট এক্সপোর্ট
    document.getElementById('export-salaries-btn').onclick = () => {
        const month = document.getElementById('salary-month-filter').value;
        if (!month) {
            showToast('Please select a month for the salary report.', 'error');
            return;
        }
        
        const filteredSalaries = store.get('salaries').filter(s => s.month === month);

        if (filteredSalaries.length === 0) {
            showToast(`No salary data found for ${month}.`, 'info');
            return;
        }

        const headers = ['Teacher_Name', 'Month', 'Base_Salary', 'Bonus', 'Deductions', 'Net_Pay', 'Status', 'Paid_Date'];
        const rows = filteredSalaries.map(s => {
            const teacher = store.getMap('teachers').get(s.teacherId?._id || s.teacherId);
            return [
                teacher?.name || 'N/A',
                s.month,
                s.baseSalary,
                s.bonus,
                s.deductions,
                s.netPay,
                s.status,
                s.paidDate || 'N/A'
            ];
        });
        exportToCsv(`salary_report_${month}.csv`, headers, rows);
    };
    
    // Expense রিপোর্ট এক্সপোর্ট
    document.getElementById('export-expenses-btn').onclick = () => {
        const startDate = document.getElementById('expense-start-date').value;
        const endDate = document.getElementById('expense-end-date').value;
        
        let filteredExpenses = store.get('expenses');

        if (startDate && endDate) {
            filteredExpenses = filteredExpenses.filter(e => {
                const itemDate = new Date(e.date);
                return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
            });
        }

        if (filteredExpenses.length === 0) {
            showToast('No expense data found for the selected date range.', 'info');
            return;
        }

        const headers = ['Date', 'Category', 'Amount', 'Description'];
        const rows = filteredExpenses.map(e => [e.date, e.category, e.amount, `"${e.description.replace(/"/g, '""')}"`]);
        exportToCsv(`expense_report.csv`, headers, rows);
    };

    // Profit & Loss সামারি এক্সপোর্ট
    document.getElementById('export-pl-btn').onclick = () => {
        const startDate = document.getElementById('pl-start-date').value;
        const endDate = document.getElementById('pl-end-date').value;

        if (!startDate || !endDate) {
            showToast('Please select a start and end date for the summary.', 'error');
            return;
        }
        
        const totalIncome = store.get('fees').filter(f => {
            if (f.status !== 'Paid' || !f.paidDate) return false;
            const paidDate = new Date(f.paidDate);
            return paidDate >= new Date(startDate) && paidDate <= new Date(endDate);
        }).reduce((sum, f) => sum + f.amount, 0);

        const totalSalaries = store.get('salaries').filter(s => {
            if (s.status !== 'Paid' || !s.paidDate) return false;
            const paidDate = new Date(s.paidDate);
            return paidDate >= new Date(startDate) && paidDate <= new Date(endDate);
        }).reduce((sum, s) => sum + s.netPay, 0);

        const totalExpenses = store.get('expenses').filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
        }).reduce((sum, e) => sum + e.amount, 0);
        
        const totalOutcome = totalSalaries + totalExpenses;
        const netProfit = totalIncome - totalOutcome;

        const headers = ['Category', 'Amount'];
        const rows = [
            ['Total Income (Fees Collected)', formatCurrency(totalIncome)],
            ['Total Outcome (Salaries Paid)', formatCurrency(totalSalaries)],
            ['Total Outcome (Other Expenses)', formatCurrency(totalExpenses)],
            ['Total Outcome (Combined)', formatCurrency(totalOutcome)],
            ['Net Profit / Loss', formatCurrency(netProfit)]
        ];
        exportToCsv(`profit_loss_summary_${startDate}_to_${endDate}.csv`, headers, rows);
    };
}