// in frontend/src/pages/staff.js

import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { renderGenericListPage } from '../utils/genericListPage.js';
import { closeAnimatedModal, generateInitialsAvatar, openBulkInsertModal, openFormModal, showConfirmationModal, showToast } from '../utils/helpers.js';

export async function renderStaffPage() {
    const config = {
        title: 'Staff Management',
        collectionName: 'staffs',
        columns: [
            { 
                label: 'Name', 
                render: item => `
                    <div class="flex items-center gap-3">
                        <img src="${item.profileImage || generateInitialsAvatar(item.name)}" 
                             alt="${item.name}" 
                             class="w-10 h-10 rounded-full object-cover">
                        <div>
                            <p class="font-semibold text-white">${item.name || 'N/A'}</p>
                            <a href="mailto:${item.email}" class="text-xs text-slate-400 hover:text-blue-400 transition-colors">${item.email || 'N/A'}</a>
                        </div>
                    </div>`
            },
            { label: 'Role / Profession', key: 'jobTitle' },
            { label: 'Contact', key: 'contact' },
        ],
        formFields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true },
            { name: 'email', label: 'Email Address (for login)', type: 'email', required: true },
            { name: 'jobTitle', label: 'Role / Profession', type: 'select', required: true, options: `
                <option value="Admin">Admin</option>
                <option value="Accountant">Accountant</option>
                <option value="Librarian">Librarian</option>
                <option value="Staff">General Staff</option>
                <option value="Nanny">Nanny</option> 
            `},
            { name: 'contact', label: 'Contact Number', type: 'tel', required: true },
            { name: 'address', label: 'Address', type: 'textarea' },
            { name: 'qualifications', label: 'Qualifications', type: 'text' },
            { name: 'baseSalary', label: 'Base Salary (BDT)', type: 'number' },
        ],
        hideAddButton: false,
        search: true,
        searchPlaceholder: "Search by name, role, etc...",
        customAddFunction: () => {
            const createFormFields = [ ...config.formFields, { name: 'password', label: 'Initial Password', type: 'password', required: true } ];
            openFormModal('Add New Staff Member', createFormFields, async (formData) => {
                const newStaffProfile = await apiService.create('staffs', formData);
                if (newStaffProfile?.id) {
                    await apiService.create('users', {
                        name: newStaffProfile.name, email: newStaffProfile.email, password: formData.password,
                        role: newStaffProfile.jobTitle, staffId: newStaffProfile.id
                    });
                    showToast('Staff member added successfully!', 'success');
                    renderStaffPage();
                } else { showToast('Failed to create staff profile.', 'error'); }
            });
        },
        customHeader: `<button id="bulk-insert-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-file-import"></i> Bulk Insert</button>`,
        hideActions: true,
        preventDefaultEdit: true,
        customListeners: (items) => {
            document.getElementById('bulk-insert-btn').onclick = () => {
                openBulkInsertModal('staffs', 'Staff', ['name', 'email', 'password', 'jobTitle', 'contact'], 
                { name: 'Jane Doe', email: 'jane.doe@school.com', password: 'password123', jobTitle: 'Librarian', contact: '555-0102' });
            };
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.onclick = () => {
                    const staffId = btn.dataset.id;
                    const staffData = items.find(item => item.id === staffId);
                    if (staffData) {
                        const onSubmit = async (formData) => {
                            if (await apiService.update('staffs', staffId, formData)) {
                                showToast('Staff details updated successfully!', 'success');
                                renderStaffPage();
                            }
                        };
                        const onDelete = () => {
                            showConfirmationModal(`Are you sure you want to delete ${staffData.name}?`, async () => {
                                if (await apiService.remove('staffs', staffId)) {
                                    showToast('Staff member deleted.', 'success');
                                    closeAnimatedModal(ui.modal);
                                    renderStaffPage();
                                }
                            });
                        };
                        const modalConfig = { collectionName: 'staffs', title: 'Staff' };
                        openFormModal('Edit Staff & Colleagues', config.formFields, onSubmit, staffData, onDelete, modalConfig);
                    }
                };
            });
        }
    };
    if (currentUser.role === 'Admin') {
        config.columns.push({
            label: 'Actions',
            render: (item) => `<button class="text-blue-400 hover:text-blue-300 edit-btn" data-id="${item.id}">Edit</button>`
        });
    }
    renderGenericListPage(config);
}