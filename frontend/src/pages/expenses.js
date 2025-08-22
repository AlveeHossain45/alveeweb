import { apiService } from '../apiService.js';
import { renderGenericListPage } from '../utils/genericListPage.js';
import { openFormModal, showConfirmationModal, showToast } from '../utils/helpers.js';
export async function renderExpensesPage() {
    const formatCurrency = (value) => `BDT ${Number(value || 0).toLocaleString()}`;
    // --- NEW: Helper function for formatting dates ---
    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const config = {
        title: 'Expense',
        collectionName: 'expenses',
        searchKeys: ['category', 'description'],
        columns: [
            // --- MODIFIED: Date column now uses our formatter ---
            { 
                label: 'Date', 
                render: (item) => formatDate(item.date), 
                sortable: true,
                key: 'date'
            },
            { label: 'Category', key: 'category', sortable: true },
            { label: 'Amount', render: (item) => formatCurrency(item.amount), key: 'amount', sortable: true },
            { label: 'Description', key: 'description' },
            // --- THIS IS THE NEW ACTIONS COLUMN ---
            {
                label: 'Actions',
                render: (item) => `
                    <div class="flex items-center justify-start gap-4">
                        <button class="text-blue-400 hover:text-blue-300 edit-expense-btn" data-id="${item.id}" title="Edit Expense">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-500 hover:text-red-400 delete-expense-btn" data-id="${item.id}" title="Delete Expense">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `
            }
        ],
        formFields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'category', label: 'Category', type: 'text', required: true, placeholder: 'e.g., Utilities, Supplies' },
            { name: 'amount', label: 'Amount (BDT)', type: 'number', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
        ],
        // --- NEW: Custom listener to handle the new buttons ---
        customListeners: (items) => {
            // Edit button listener
            document.querySelectorAll('.edit-expense-btn').forEach(btn => {
                btn.onclick = () => {
                    const expenseId = btn.dataset.id;
                    const expenseData = items.find(item => item.id === expenseId);
                    if (expenseData) {
                        openFormModal('Edit Expense', config.formFields, async (formData) => {
                            if (await apiService.update('expenses', expenseId, formData)) {
                                showToast('Expense updated successfully!', 'success');
                                renderExpensesPage();
                            }
                        }, expenseData);
                    }
                };
            });

            // Delete button listener
            document.querySelectorAll('.delete-expense-btn').forEach(btn => {
                btn.onclick = () => {
                    const expenseId = btn.dataset.id;
                    showConfirmationModal('Are you sure you want to delete this expense record?', async () => {
                        if (await apiService.remove('expenses', expenseId)) {
                            showToast('Expense record deleted.', 'success');
                            renderExpensesPage();
                        }
                    });
                };
            });
        }
    };
    
    // Tell the generic renderer not to create its own edit/action columns
    renderGenericListPage({ ...config, hideActions: true, preventDefaultEdit: true });
}