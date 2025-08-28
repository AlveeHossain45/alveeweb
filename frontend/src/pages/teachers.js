import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { ui } from '../ui.js';
import { closeAnimatedModal, generateInitialsAvatar, openBulkInsertModal, openFormModal, showConfirmationModal, showToast, debounce } from '../utils/helpers.js';

export async function renderTeachersPage() {
    
    const state = {
        view: 'departments', // Can be 'departments' or 'teachers'
        selectedDeptId: null,
        selectedDeptName: '',
        searchQuery: '',
        sortConfig: { key: 'name', direction: 'asc' },
        advancedSearch: {
            isOpen: false,
            qualifications: '',
            minSalary: '',
            maxSalary: '',
            hasAddress: false
        }
    };

    // --- Data variables to be used across the component ---
    let allDepartments, allTeachers;

    ui.contentArea.onclick = (e) => {
        const backBtn = e.target.closest('.back-btn');
        const departmentCard = e.target.closest('.premium-card');
        const addTeacherBtn = e.target.closest('#add-teacher-btn');
        const bulkInsertBtn = e.target.closest('#bulk-insert-btn');
        const toggleAdvancedBtn = e.target.closest('#toggle-advanced-search');
        const applyFiltersBtn = e.target.closest('#apply-filters-btn');
        const resetFiltersBtn = e.target.closest('#reset-filters-btn');
        const sortableHeader = e.target.closest('.sortable-header');
        const editBtn = e.target.closest('.edit-btn');

        if (backBtn) {
            state.view = 'departments';
            state.searchQuery = '';
            mainRender();
            return;
        }
        if (departmentCard) {
            state.view = 'teachers';
            state.selectedDeptId = departmentCard.dataset.id;
            state.selectedDeptName = departmentCard.dataset.name;
            mainRender();
            return;
        }
        if (addTeacherBtn) {
            openTeacherForm(null);
            return;
        }
        if (bulkInsertBtn) {
            insertDocumentForTeachers();
            return;
        }
        if (toggleAdvancedBtn) {
            state.advancedSearch.isOpen = !state.advancedSearch.isOpen;
            renderTeacherTableView(); // Re-render only the teacher view, not the whole page
            return;
        }
        if (applyFiltersBtn) {
            state.advancedSearch.qualifications = document.getElementById('qualifications-filter').value;
            state.advancedSearch.minSalary = document.getElementById('min-salary-filter').value;
            state.advancedSearch.maxSalary = document.getElementById('max-salary-filter').value;
            state.advancedSearch.hasAddress = document.getElementById('has-address-filter').checked;
            handleFilterAndSort(); // Only update the table rows
            return;
        }
        if (resetFiltersBtn) {
            state.advancedSearch = { isOpen: true, qualifications: '', minSalary: '', maxSalary: '', hasAddress: false };
            renderTeacherTableView(); // Re-render the view to clear inputs
            return;
        }
        if (sortableHeader) {
            const key = sortableHeader.dataset.sortKey;
            if (state.sortConfig.key === key) {
                state.sortConfig.direction = state.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortConfig.key = key;
                state.sortConfig.direction = 'asc';
            }
            handleFilterAndSort(); // Only update the table rows
            return;
        }
        if (editBtn) {
            const teacher = allTeachers.find(t => t.id === editBtn.dataset.id);
            if (teacher) openTeacherForm(teacher);
            return;
        }
    };

    // --- 3. INITIAL DATA FETCH & LOADING UI ---
    ui.contentArea.innerHTML = `
    <div class="h-[70vh] flex flex-col items-center justify-center">
        <div class="relative w-24 h-24 mb-6">
            <div class="absolute inset-0 bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500 rounded-full opacity-20 animate-pulse"></div>
            <div class="absolute inset-2 border-t-2 border-l-2 border-purple-500/30 rounded-full animate-spin"></div>
            <div class="absolute inset-4 flex items-center justify-center">
                <i class="fas fa-chalkboard-teacher text-3xl text-purple-400 animate-bounce"></i>
            </div>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">Loading Teacher Directory</h3>
        <p class="text-sm text-slate-400">Organizing faculty and academic staff...</p>
    </div>`;

    try {
        await Promise.all([
            store.refresh('teachers'),
            store.refresh('departments')
        ]);
        allDepartments = store.get('departments');
        allTeachers = store.get('teachers');
    } catch (error) {
        showToast('Failed to load teacher data', 'error');
        console.error("Data loading error:", error);
        return;
    }

    // --- 4. DYNAMIC UI HELPER FUNCTIONS ---
    // These functions build reusable pieces of the UI.

    const createPageHeader = (title, subtitle, backTarget = null) => {
        return `
        <div class="relative overflow-hidden p-8 rounded-2xl mb-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 border border-slate-700/50 shadow-xl">
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full filter blur-3xl animate-float"></div>
            <div class="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-full filter blur-3xl animate-float" style="animation-delay: 2s;"></div>
            <div class="flex items-center justify-between relative z-10">
                <div class="text-center md:text-left">
                    <h2 class="text-3xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">${title}</h2>
                    <p class="text-slate-300/80 max-w-2xl mx-auto md:mx-0">${subtitle}</p>
                </div>
                ${backTarget ? `
                <button data-target="${backTarget}" class="back-btn px-4 py-2 rounded-xl bg-indigo-700/40 hover:bg-indigo-600/60 text-white transition-all duration-300 hover:shadow-lg backdrop-blur-sm border border-indigo-500/30 flex items-center gap-2">
                    <i class="fas fa-chevron-left"></i>
                    <span>Back</span>
                </button>` : ''}
            </div>
        </div>`;
    };

    const createCard = ({ icon, title, count, delay, data = {} }) => {
        const colors = {
            purple: 'from-purple-500/10 to-indigo-600/20 border-purple-500/20 text-purple-400',
            pink: 'from-pink-500/10 to-rose-600/20 border-pink-500/20 text-pink-400',
            blue: 'from-blue-500/10 to-cyan-600/20 border-blue-500/20 text-blue-400',
            green: 'from-emerald-500/10 to-teal-600/20 border-emerald-500/20 text-emerald-400',
            orange: 'from-orange-500/10 to-amber-600/20 border-orange-500/20 text-orange-400',
        };
        const colorKeys = Object.keys(colors);
        const selectedColor = colorKeys[delay % colorKeys.length];
        return `
        <div class="fade-in-item premium-card cursor-pointer group relative rounded-2xl overflow-hidden transition-all duration-300 
            bg-gradient-to-br ${colors[selectedColor]} border hover:shadow-xl hover:-translate-y-1.5"
            style="animation-delay: ${delay * 75}ms;" ${Object.entries(data).map(([k, v]) => `data-${k}="${v}"`).join(' ')}>
            <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="p-6 flex items-center gap-5 relative z-10">
                <div class="w-14 h-14 rounded-xl flex items-center justify-center backdrop-blur-sm bg-white/5 border border-white/10 shadow-lg"><i class="fas ${icon} text-xl"></i></div>
                <div>
                    <h3 class="text-xl font-bold text-white">${title}</h3>
                    <p class="text-xs font-semibold mt-2 text-white/60">${count} ${count === 1 ? 'Teacher' : 'Teachers'}</p>
                </div>
                <i class="fas fa-chevron-right text-slate-500 ml-auto transition-transform duration-300 group-hover:translate-x-1 group-hover:text-pink-400"></i>
            </div>
        </div>`;
    };


const createAdvancedSearchPanel = () => {
    return `
    <div class="advanced-search-panel mt-6 p-6 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 backdrop-blur-sm transition-all duration-500 overflow-hidden ${state.advancedSearch.isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2"><i class="fas fa-filter text-purple-400"></i> Advanced Filters</h3>
        
       
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Qualifications</label>
                <input type="text" id="qualifications-filter" value="${state.advancedSearch.qualifications}" class="w-full p-2.5 rounded-lg bg-slate-700/60 border border-slate-600/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g., PhD, MSc">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Min Salary (BDT)</label>
                <input type="number" id="min-salary-filter" value="${state.advancedSearch.minSalary}" class="w-full p-2.5 rounded-lg bg-slate-700/60 border border-slate-600/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Minimum">
            </div>
            <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Max Salary (BDT)</label>
                <input type="number" id="max-salary-filter" value="${state.advancedSearch.maxSalary}" class="w-full p-2.5 rounded-lg bg-slate-700/60 border border-slate-600/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="Maximum">
            </div>
            <div class="flex items-end pb-1">
                <label class="flex items-center mt-2 cursor-pointer">
                    <div class="relative">
                        <input type="checkbox" id="has-address-filter" ${state.advancedSearch.hasAddress ? 'checked' : ''} class="sr-only">
                        <div class="block w-10 h-6 bg-slate-600 rounded-full"></div>
                        <div class="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${state.advancedSearch.hasAddress ? 'translate-x-4 bg-purple-400' : ''}"></div>
                    </div>
                    <span class="ml-3 text-sm text-slate-300">Has Address</span>
                </label>
            </div>
        </div>
                <div class="flex justify-end items-center flex-wrap gap-3 mt-6">
            <button id="reset-filters-btn" class="px-4 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-colors">Reset Filters</button>
            <button id="apply-filters-btn" class="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold transition-all">Apply Filters</button>
        </div>
    </div>`;
};


    // --- 5. CORE LOGIC & ACTION FUNCTIONS ---

    const applyAdvancedFilters = (teachers) => {
        let filtered = [...teachers];
        const { qualifications, minSalary, maxSalary, hasAddress } = state.advancedSearch;
        if (qualifications) { const q = qualifications.toLowerCase(); filtered = filtered.filter(t => t.qualifications?.toLowerCase().includes(q)); }
        if (minSalary) { const min = parseFloat(minSalary); filtered = filtered.filter(t => t.baseSalary && parseFloat(t.baseSalary) >= min); }
        if (maxSalary) { const max = parseFloat(maxSalary); filtered = filtered.filter(t => t.baseSalary && parseFloat(t.baseSalary) <= max); }
        if (hasAddress) { filtered = filtered.filter(t => t.address?.trim().length > 0); }
        return filtered;
    };

    const handleFilterAndSort = () => {
        let teachersInDept = allTeachers.filter(t => t.departmentId?.id === state.selectedDeptId);
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            teachersInDept = teachersInDept.filter(t => t.name.toLowerCase().includes(query) || t.email?.toLowerCase().includes(query));
        }
        teachersInDept = applyAdvancedFilters(teachersInDept);
        teachersInDept.sort((a, b) => {
            const aValue = a[state.sortConfig.key] || ''; const bValue = b[state.sortConfig.key] || '';
            const direction = state.sortConfig.direction === 'asc' ? 1 : -1;
            if (typeof aValue === 'string') return aValue.localeCompare(bValue) * direction;
            return (aValue - bValue) * direction;
        });
        renderTeacherList(teachersInDept);
    };


    const openTeacherForm = (teacherData = null) => {
        const isEditing = !!teacherData;
        const title = isEditing ? `Edit Teacher Profile` : 'Add New Teacher';
        const formFields = [
            { name: 'name', label: 'Full Name', type: 'text', required: true },
            { name: 'email', label: 'Email (will be username)', type: 'email', required: true },
            { name: 'departmentId', label: 'Primary Department', type: 'select', options: allDepartments.map(d => `<option value="${d.id}" ${teacherData && teacherData.departmentId?.id === d.id ? 'selected' : ''}>${d.name}</option>`).join(''), required: true },
            { name: 'contact', label: 'Contact', type: 'tel', required: true },
            { name: 'address', label: 'Address', type: 'textarea' },
            { name: 'qualifications', label: 'Qualifications', type: 'text' },
            { name: 'baseSalary', label: 'Base Salary (BDT)', type: 'number' },
        ];
        if (!isEditing) { formFields.push({ name: 'password', label: 'Initial Password', type: 'password', required: true }); }

        const onSubmit = async (formData) => {
            // ... (keep this logic the same)
            if (!isEditing) formData.departmentId = state.selectedDeptId;
            try {
                if (isEditing) {
                    await apiService.update('teachers', teacherData.id, formData);
                    showToast('Teacher updated successfully!', 'success');
                } else {
                    const newTeacher = await apiService.create('teachers', formData);
                    if (!newTeacher || !newTeacher.id) {
                        showToast("Could not create teacher.", "error"); return;
                    }
                    await apiService.create('users', { name: newTeacher.name, email: newTeacher.email, password: formData.password, role: 'Teacher', teacherId: newTeacher.id });
                    showToast('Teacher added successfully!', 'success');
                }
                await store.refresh('teachers');
                allTeachers = store.get('teachers');
                closeAnimatedModal(ui.modal);
                mainRender();
            } catch (error) {
                showToast("Operation failed.", "error"); console.error("Form submission error:", error);
            }
        };

        const onDelete = isEditing ? async () => {
            // ... (keep this logic the same)
            showConfirmationModal(`Delete ${teacherData.name}?`, async () => {
                if (await apiService.remove('teachers', teacherData.id)) {
                    showToast('Teacher deleted.', 'success');
                    await store.refresh('teachers');
                    allTeachers = store.get('teachers');
                    closeAnimatedModal(ui.modal);
                    mainRender();
                }
            });
        } : null;


        const modalConfig = { collectionName: 'teachers', title: 'Teacher' };
        openFormModal(title, formFields, onSubmit, teacherData || {}, onDelete, modalConfig);
        // ----------------------
    };



    const insertDocumentForTeachers = () => { openBulkInsertModal('teachers', 'Teachers', ['name', 'email', 'password', 'contact', 'departmentName'], { name: "Dr. Jane Smith", email: "jane@school.com", password: "password123", contact: "555-1234", departmentName: "CSE" }); };



    const renderDepartmentView = () => {
        const deptData = allDepartments.map(dept => ({ ...dept, teacherCount: allTeachers.filter(t => t.departmentId?.id === dept.id).length }));
        ui.contentArea.innerHTML = `
        <div class="animate-fade-in">
            ${createPageHeader('Teacher Directory', 'Browse faculty by their primary department')}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${deptData.map((dept, i) => createCard({ icon: 'fa-building', title: dept.name, count: dept.teacherCount, delay: i, data: { id: dept.id, name: dept.name } })).join('')}
            </div>
        </div>`;
    };

    const renderTeacherList = (teachersToDisplay) => {
        const tableBody = document.getElementById('teacher-table-body');
        if (!tableBody) return;
        const countDisplay = document.getElementById('teacher-count-display');
        const totalTeachersInDept = allTeachers.filter(t => t.departmentId?.id === state.selectedDeptId).length;
        if (countDisplay) {
            let countText = `Showing ${teachersToDisplay.length} of ${totalTeachersInDept} teachers`;
            if (Object.values(state.advancedSearch).some(val => val && val !== false)) {
                countText += ' <span class="ml-2 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">Filters Applied</span>';
            }
            countDisplay.innerHTML = countText;
        }
        if (teachersToDisplay.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8"><div class="flex flex-col items-center justify-center text-slate-400"><i class="fas fa-user-slash text-4xl mb-4 text-purple-500/50"></i><p class="text-lg font-medium">No teachers found</p><p class="text-sm mt-1">${state.searchQuery || Object.values(state.advancedSearch).some(v => v) ? 'Try adjusting your search or filters' : 'No teachers in this department'}</p></div></td></tr>`;
            return;
        }
        tableBody.innerHTML = teachersToDisplay.map(teacher => `
        <tr class="hover:bg-slate-700/30 transition-colors group">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="relative flex-shrink-0">
                    <img src="${teacher.profileImage || generateInitialsAvatar(teacher.name)}" 
                             alt="${teacher.name}" 
                             class="w-10 h-10 rounded-full object-cover border-2 border-slate-600 group-hover:border-purple-500 transition-colors">
                    </div>
                    <div>
                        <p class="font-semibold text-white">${teacher.name}</p>
                        <a href="mailto:${teacher.email}" class="text-xs text-slate-400 hover:text-blue-400 transition-colors">${teacher.email}</a>
                    </div>
                </div>
            </td>
            <td class="p-4"><div class="flex flex-col"><span class="text-white">${teacher.contact || 'N/A'}</span>${teacher.address ? `<span class="text-xs text-slate-400 truncate max-w-xs">${teacher.address}</span>` : ''}</div></td>
            <td class="p-4"><div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50"><i class="fas fa-graduation-cap text-xs text-purple-400"></i><span>${teacher.qualifications || 'N/A'}</span></div></td>
            <td class="p-4"><div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50"><i class="fas fa-money-bill-wave text-xs text-green-400"></i><span>${teacher.baseSalary ? 'BDT ' + parseInt(teacher.baseSalary).toLocaleString() : 'N/A'}</span></div></td>
            <td class="p-4 text-right"><button class="edit-btn bg-gradient-to-r from-blue-500/20 to-blue-600/30 hover:from-blue-500/30 hover:to-blue-600/40 text-blue-400 hover:text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-all border border-blue-500/30 hover:border-blue-400/50 ml-auto" data-id="${teacher.id}"><i class="fas fa-edit text-xs"></i> Edit</button></td>
        </tr>
    `).join('');
    };


const renderTeacherTableView = () => {
    const getSortIcon = (key) => {
        if (state.sortConfig.key !== key) return `fas fa-sort text-slate-500 text-xs`;
        return state.sortConfig.direction === 'asc' ? `fas fa-chevron-up text-purple-400 text-xs` : `fas fa-chevron-down text-purple-400 text-xs`;
    };
    ui.contentArea.innerHTML = `
    <div class="animate-fade-in">
        ${createPageHeader(`Department of ${state.selectedDeptName}`, `Manage teachers assigned to this department`, 'departments')}
        <div class="bg-gradient-to-br from-slate-800/70 to-slate-900/50 p-6 rounded-xl border border-slate-700/50 shadow-xl backdrop-blur-sm">
            
            <!-- THIS IS THE CORRECTED HEADER SECTION -->
            <div class="flex flex-col md:flex-row flex-wrap justify-between items-center mb-6 gap-4">
                <div class="relative w-full md:flex-grow md:max-w-md">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                    <input type="text" id="teacher-search" class="w-full p-3 pl-10 rounded-xl bg-slate-700/60 border border-slate-600/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm" placeholder="Search teachers..." value="${state.searchQuery}">
                </div>
                
                <!-- This container's classes are now fixed to wrap correctly -->
                <div class="flex items-center flex-wrap justify-start md:justify-end shrink-0 gap-3 w-full md:w-auto">
                    <button id="toggle-advanced-search" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20">
                        <i class="fas ${state.advancedSearch.isOpen ? 'fa-times' : 'fa-filter'}"></i> 
                        <span>${state.advancedSearch.isOpen ? 'Hide' : 'Advanced Search'}</span>
                    </button>
                    <button id="bulk-insert-btn" class="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20">
                        <i class="fas fa-file-import"></i> <span>Insert Document</span>
                    </button>
                    <button id="add-teacher-btn" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20">
                        <i class="fas fa-user-plus"></i> <span>Add Teacher</span>
                    </button>
                </div>
            </div>
            <!-- END OF CORRECTION -->

            ${createAdvancedSearchPanel()}
            <div id="teacher-count-display" class="text-slate-400 text-sm mt-6"></div>
            <div class="overflow-x-auto custom-scrollbar rounded-xl border border-slate-700/50 mt-4">
                <table class="min-w-full divide-y divide-slate-700/50">
                    <thead class="bg-slate-700/40 backdrop-blur-sm">
                        <tr>
                            <th class="p-4 text-left cursor-pointer hover:bg-slate-700/60 transition-colors sortable-header" data-sort-key="name"><div class="flex items-center gap-2"><span>Name</span><i class="${getSortIcon('name')}"></i></div></th>
                            <th class="p-4 text-left">Contact</th>
                            <th class="p-4 text-left cursor-pointer hover:bg-slate-700/60 transition-colors sortable-header" data-sort-key="qualifications"><div class="flex items-center gap-2"><span>Qualifications</span><i class="${getSortIcon('qualifications')}"></i></div></th>
                            <th class="p-4 text-left cursor-pointer hover:bg-slate-700/60 transition-colors sortable-header" data-sort-key="baseSalary"><div class="flex items-center gap-2"><span>Salary</span><i class="${getSortIcon('baseSalary')}"></i></div></th>
                            <th class="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="teacher-table-body" class="divide-y divide-slate-700/30"></tbody>
                </table>
            </div>
        </div>
    </div>`;
    document.getElementById('teacher-search')?.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value;
        handleFilterAndSort();
    }, 300));
    handleFilterAndSort();
};


    // --- 7. MAIN CONTROLLER ---
    // This function decides which view to show based on the current state.
    const mainRender = () => {
        switch (state.view) {
            case 'departments':
                renderDepartmentView();
                break;
            case 'teachers':
                renderTeacherTableView();
                break;
            default:
                renderDepartmentView();
        }
    };

    // Initial render to start the page
    mainRender();
}