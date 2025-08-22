// in frontend/src/pages/accountantDashboard.js

import { navigateTo } from '../router.js';
import { store } from '../store.js';
import { ui } from '../ui.js';
import { createDashboardCard } from '../utils/helpers.js';

export const renderAccountantDashboard = async () => {
    await Promise.all([
        store.refresh('fees'),
        store.refresh('salaries'),
        store.refresh('expenses')
    ]);

    const fees = store.get('fees');
    const salaries = store.get('salaries');
    const expenses = store.get('expenses');

    const allFinancialMonths = [...new Set([...salaries.map(s => s.month), ...expenses.map(e => e.date.slice(0, 7))])].sort().reverse();
    const targetMonth = allFinancialMonths.length > 0 ? allFinancialMonths[0] : new Date().toISOString().slice(0, 7);
    const monthName = new Date(targetMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' });

    const totalFeesCollected = fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
    const totalFeesDue = fees.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0);
    const salariesPaidThisMonth = salaries.filter(s => s.month === targetMonth && s.status === 'Paid').reduce((sum, s) => sum + s.netPay, 0);
    const expensesThisMonth = expenses.filter(e => e.date.startsWith(targetMonth)).reduce((sum, e) => sum + e.amount, 0);
    
    const formatCurrency = (value) => `BDT ${Number(value || 0).toLocaleString()}`;

    const statCards = [
        { title: 'Total Fees Collected (All Time)', value: formatCurrency(totalFeesCollected), icon: 'fa-hand-holding-usd', color: 'green' },
        { title: 'Outstanding Fees (All Time)', value: formatCurrency(totalFeesDue), icon: 'fa-exclamation-circle', color: 'yellow' },
        { title: `Salaries Paid (${monthName})`, value: formatCurrency(salariesPaidThisMonth), icon: 'fa-money-check-alt', color: 'blue' },
        { title: `Expenses (${monthName})`, value: formatCurrency(expensesThisMonth), icon: 'fa-receipt', color: 'indigo' },
    ];

    ui.contentArea.innerHTML = `
        <div class="animate-fade-in">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${statCards.map(createDashboardCard).join('')}</div>
            <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                    <h3 class="text-xl font-semibold mb-4 text-white">Financial Summary for ${monthName}</h3>
                    <div id="income-expense-chart-container" class="h-64 flex items-center justify-center">
                        <canvas id="incomeExpenseChart"></canvas>
                    </div>
                </div>
                <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                     <h3 class="text-xl font-semibold mb-4 text-white">Quick Actions</h3>
                     <div class="space-y-3">
                        <button data-page="fees" class="quick-action-btn bg-blue-600/20 text-blue-300 border-blue-500"><i class="fas fa-file-invoice-dollar"></i>Manage Fee Collection</button>
                        <button data-page="salaries" class="quick-action-btn bg-green-600/20 text-green-300 border-green-500"><i class="fas fa-money-check-alt"></i>Process Salaries</button>
                        <button data-page="expenses" class="quick-action-btn bg-yellow-600/20 text-yellow-300 border-yellow-500"><i class="fas fa-receipt"></i>Log an Expense</button>
                     </div>
                </div>
            </div>
        </div>
    `;

    // --- THIS IS THE FIX: Attach event listeners programmatically ---
    document.querySelectorAll('.quick-action-btn').forEach(button => {
        button.addEventListener('click', () => {
            navigateTo(button.dataset.page);
        });
    });

    const incomeExpenseCtx = document.getElementById('incomeExpenseChart')?.getContext('2d');
    const chartContainer = document.getElementById('income-expense-chart-container');
    if (incomeExpenseCtx) {
        const feesCollectedThisMonth = fees.filter(f => f.paidDate && f.paidDate.startsWith(targetMonth)).reduce((sum, f) => sum + f.amount, 0);
        
        if (feesCollectedThisMonth === 0 && salariesPaidThisMonth === 0 && expensesThisMonth === 0) {
             chartContainer.innerHTML = `<p class="text-slate-500 italic">No financial data for ${monthName} to display.</p>`;
        } else {
            new Chart(incomeExpenseCtx, {
                type: 'bar',
                data: {
                    labels: ['Income (Fees)', 'Outcome (Salaries + Expenses)'],
                    datasets: [{
                        label: `Amount in ${monthName} (BDT)`,
                        data: [feesCollectedThisMonth, salariesPaidThisMonth + expensesThisMonth],
                        backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(239, 68, 68, 0.6)'],
                        borderColor: ['#22c55e', '#ef4444'],
                        borderWidth: 1
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: '#e2e8f0' } }, x: { ticks: { color: '#e2e8f0' } } } }
            });
        }
    }
};