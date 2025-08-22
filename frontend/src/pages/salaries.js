import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { showToast } from '../utils/helpers.js';
import { openFormModal, openBulkInsertModal, showConfirmationModal } from '../utils/helpers.js';

export async function renderSalaryPage() {
   
    await Promise.all([
        store.refresh('salaries'),
        store.refresh('teachers') 
    ]);

    const salaries = store.get('salaries');
    const teachers = store.get('teachers');
    
    
    const formatCurrency = (value) => `BDT ${Number(value || 0).toLocaleString()}`;
        
    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    ui.contentArea.innerHTML = `
        <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in">
            <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h3 class="text-xl font-semibold">Salary Management</h3>
                <div class="flex flex-wrap gap-4 items-center">
                    <button id="process-salaries-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Process Current Month Salaries</button>
                    <button id="add-new-salary-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-plus"></i> Add New Salary</button>
                </div>
            </div>
            <div id="salary-list-container" class="overflow-x-auto custom-scrollbar">
                <!-- Salary table will be rendered here -->
            </div>
        </div>
    `;

    const salaryListContainer = document.getElementById('salary-list-container');
    if (salaries.length === 0) {
        salaryListContainer.innerHTML = `<p class="text-center text-slate-400 py-8">No salary data found.</p>`;
    } else {
        salaryListContainer.innerHTML = `
            <table class="min-w-full">
                <thead class="bg-slate-700">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Teacher</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Month</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Net Pay</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-700">
                    ${salaries.map(item => `
                        <tr class="hover:bg-slate-700/30">
                            <!-- FIX 2: Correctly display the teacher's name from the populated data -->
                            <td class="px-4 py-4">${item.teacherId?.name || '<span class="text-red-400">N/A</span>'}</td>
                            <td class="px-4 py-4">${item.month}</td>
                            <td class="px-4 py-4">${formatCurrency(item.netPay)}</td>
                            <td class="px-4 py-4"><span class="status-badge ${item.status === 'Paid' ? 'status-paid' : 'status-pending'}">${item.status}</span></td>
                            <td class="px-4 py-4">
                                <div class="flex items-center gap-4">
                                    ${item.status === 'Pending' 
                                        ? `<button class="text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg pay-salary-btn" data-id="${item.id}">Mark as Paid</button>` 
                                        : `<span class="text-xs text-slate-400">Paid on ${formatDate(item.paidDate)}</span>`
                                    }
                                    <!-- FIX 3: Add the new delete button -->
                                    <button class="text-red-500 hover:text-red-400 delete-salary-btn" data-id="${item.id}" title="Delete Record">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // 1. "Process Salaries" বাটনের জন্য:
    document.getElementById('process-salaries-btn').onclick = () => {
        // প্রথমে চেক করা হচ্ছে কোনো শিক্ষক আছে কিনা
        if (!teachers || teachers.length === 0) {
            // যদি কোনো শিক্ষক না থাকে, তাহলে একটি সতর্কবার্তা দেখানো হবে
            showToast('No teachers found in the system. Please add a teacher first.', 'error');
            return; // এখান থেকে কোড শেষ হয়ে যাবে, ফর্ম আসবে না
        }
        // যদি শিক্ষক থাকে, তাহলে ফর্ম দেখানো হবে
        const formFields = [
            { name: 'month', label: 'Salary Month to Process', type: 'month', required: true, value: new Date().toISOString().slice(0, 7) },
            { name: 'defaultBonus', label: 'Default Bonus (for all)', type: 'number', placeholder: 'e.g., Festival Bonus', value: 0 },
            { name: 'defaultDeductions', label: 'Default Deductions (for all)', type: 'number', placeholder: 'e.g., Provident Fund', value: 0 }
        ];

        openFormModal('Process Monthly Salaries', formFields, async (formData) => {
            const selectedMonth = formData.month;
            const bonusAmount = Number(formData.defaultBonus) || 0;
            const deductionAmount = Number(formData.defaultDeductions) || 0;
            
            const existingSalaries = store.get('salaries').filter(s => s.month === selectedMonth);
            let processedCount = 0;
            const salaryPromises = [];

            for (const teacher of teachers) {
                if (!existingSalaries.some(s => s.teacherId === teacher.id)) {
                    const netPay = (teacher.baseSalary || 0) + bonusAmount - deductionAmount;
                    salaryPromises.push(apiService.create('salaries', {
                        teacherId: teacher.id,
                        baseSalary: teacher.baseSalary || 0,
                        bonus: bonusAmount,
                        deductions: deductionAmount,
                        netPay: netPay,
                        month: selectedMonth,
                        status: 'Pending',
                        paidDate: null
                    }));
                    processedCount++;
                }
            }

            if (processedCount > 0) {
                await Promise.all(salaryPromises);
                showToast(`${processedCount} new salary records generated for ${selectedMonth}.`, 'success');
            } else {
                showToast(`All salaries for ${selectedMonth} were already generated.`, 'info');
            }
            
            renderSalaryPage(); // পৃষ্ঠাটি পুনরায় লোড করা
        });
    };
    // 2. "Add New Salary" বাটনের জন্য:
      document.getElementById('add-new-salary-btn').onclick = () => {
        openFormModal('Add New Salary Record', [
            // --- FIX 4: Populate the teacher dropdown with the fetched data ---
            { name: 'teacherId', label: 'Select Teacher', type: 'select', options: teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join(''), required: true },
            { name: 'month', label: 'Salary Month', type: 'month', required: true, value: new Date().toISOString().slice(0, 7) },
            { name: 'baseSalary', label: 'Base Salary (BDT)', type: 'number', required: true, placeholder: 'e.g. 25000' },
            { name: 'bonus', label: 'Bonus (BDT)', type: 'number', value: 0 },
            { name: 'deductions', label: 'Deductions (BDT)', type: 'number', value: 0 }
        ], async (formData) => {
            const netPay = (Number(formData.baseSalary) || 0) + (Number(formData.bonus) || 0) - (Number(formData.deductions) || 0);
            if (await apiService.create('salaries', { ...formData, netPay, status: 'Pending', paidDate: null })) {
                showToast('New salary record added successfully!', 'success');
                renderSalaryPage();
            }
        });
    };
    // 3. টেবিলের "Mark as Paid" বাটনের জন্য:
    document.querySelectorAll('.pay-salary-btn').forEach(btn => {
        btn.onclick = async () => {
            if (await apiService.update('salaries', btn.dataset.id, { status: 'Paid', paidDate: new Date().toISOString().slice(0,10) })) {
                showToast('Salary marked as paid.', 'success');
                renderSalaryPage();
            }
        }
    });
    
    // --- NEW "Delete" button listener ---
    document.querySelectorAll('.delete-salary-btn').forEach(btn => {
        btn.onclick = () => {
            showConfirmationModal('Are you sure you want to delete this salary record permanently?', async () => {
                if (await apiService.remove('salaries', btn.dataset.id)) {
                    showToast('Salary record deleted.', 'success');
                    renderSalaryPage();
                }
            });
        };
    });
}