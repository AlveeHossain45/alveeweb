import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { showToast } from '../utils/helpers.js';
import { openFormModal, openBulkInsertModal, showConfirmationModal } from '../utils/helpers.js';

export const renderGenericListPage = async (config) => {
    window.currentPageConfig = config;
    
    // --- STATE FOR SELECTION ---
    let isSelectionMode = false;
    const selectedIds = new Set();
    let currentItems = [];

    const {
        title, collectionName, columns, formFields, searchKeys,
        hideAddButton = false, hideActions = false, dataFilter,
        classFilter, classFilterOptions, customHeader, customListeners
    } = config;
    
    let items = config.data || await (async () => {
        await store.refresh(collectionName);
        return store.get(collectionName);
    })();
    
    if (dataFilter) items = items.filter(dataFilter);
    currentItems = [...items]; 
    const originalItems = [...items];

    const updateBulkActionBar = () => {
        const actionBar = document.getElementById('bulk-action-bar');
        const countSpan = document.getElementById('selection-count');
        if (!actionBar || !countSpan) return;

        if (isSelectionMode && selectedIds.size > 0) {
            actionBar.classList.remove('hidden');
            countSpan.textContent = selectedIds.size;
        } else {
            actionBar.classList.add('hidden');
        }
    };

    const renderTable = (data) => {
        const tableContainer = document.getElementById('generic-list-container');
        if (!tableContainer) return;
        
        if (data.length === 0) {
            tableContainer.innerHTML = `<p class="text-center text-slate-400 py-8">No ${title.toLowerCase()} data found matching your criteria.</p>`;
            return;
        }

        tableContainer.innerHTML = `
            <div class="overflow-x-auto custom-scrollbar">
                <table class="min-w-full">
                    <thead class="bg-slate-700">
                        <tr>
                            ${isSelectionMode ? `
                                <th class="px-4 py-3 text-left">
                                    <input type="checkbox" id="select-all-checkbox" class="form-checkbox">
                                </th>` : ''}
                            ${columns.map(c => `<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">${c.label}</th>`).join('')}
                            ${!hideActions && !isSelectionMode && !columns.find(c => c.label.toLowerCase() === 'action') ? `<th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>` : ''}
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-700">
                        ${data.map(item => `
                            <tr class="hover:bg-slate-700/30 ${selectedIds.has(item.id) ? 'bg-blue-900/50' : ''}" data-item-id="${item.id}">
                                ${isSelectionMode ? `
                                    <td class="px-4 py-4">
                                        <input type="checkbox" class="form-checkbox row-checkbox" data-id="${item.id}" ${selectedIds.has(item.id) ? 'checked' : ''}>
                                    </td>` : ''}
                                ${columns.map(c => `<td class="px-4 py-4 whitespace-nowrap text-sm">${c.render ? c.render(item) : (item[c.key] ?? 'N/A')}</td>`).join('')}
                                ${!hideActions && !isSelectionMode && !columns.find(c => c.label.toLowerCase() === 'action') ? `
                                    <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button class="text-blue-400 hover:text-blue-300 edit-btn" data-id="${item.id}">Edit</button>
                                    </td>
                                ` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        attachActionListeners();
        updateBulkActionBar();
    };
       const attachActionListeners = () => {
        if (isSelectionMode) {
            document.getElementById('select-all-checkbox').onchange = (e) => {
                const isChecked = e.target.checked;
                document.querySelectorAll('.row-checkbox').forEach(cb => {
                    cb.checked = isChecked;
                    const id = cb.dataset.id;
                    if (isChecked) selectedIds.add(id);
                    else selectedIds.delete(id);
                });
                renderTable(currentItems);
            };

            document.querySelectorAll('.row-checkbox').forEach(cb => {
                cb.onchange = (e) => {
                    const id = e.target.dataset.id;
                    if (e.target.checked) selectedIds.add(id);
                    else selectedIds.delete(id);
                    document.querySelector(`tr[data-item-id="${id}"]`).classList.toggle('bg-blue-900/50', e.target.checked);
                    updateBulkActionBar();
                }
            });
        } else {
            // --- THIS IS THE FIX ---
            // We now check for the preventDefaultEdit flag. If it's true, we do NOT attach this listener.
            if (!config.preventDefaultEdit) {
                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.onclick = () => {
                        const itemId = btn.dataset.id;
                        const item = originalItems.find(i => i.id === itemId);
                        openFormModal(`Edit ${title}`, formFields, async (formData) => {
                            await apiService.update(collectionName, item.id, formData);
                            showToast(`${title} updated successfully!`, 'success');
                            renderGenericListPage(config);
                        }, item);
                    };
                });
            }
            // --- END OF FIX ---
        }
        if (customListeners) customListeners(originalItems); // Pass the original items to custom listeners
    };


    ui.contentArea.innerHTML = `
        <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in">
            <!-- BULK ACTION BAR (Initially Hidden) -->
            <div id="bulk-action-bar" class="hidden fixed bottom-10 left-1/2 -translate-x-1/2 z-20 bg-slate-900 border border-blue-500 shadow-2xl p-4 rounded-xl flex items-center gap-6 animate-fade-in-up">
                <span class="text-white font-semibold"><span id="selection-count">0</span> items selected</span>
                <button id="delete-selected-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-trash-alt"></i> Delete Selected</button>
                <button id="cancel-selection-btn" class="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
            </div>

            <div class="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h3 class="text-xl font-semibold">${title} Management</h3>
                <div class="flex flex-wrap gap-4 items-center">
                    ${customHeader || ''}
                    ${config.search ? `<input type="text" id="search-input" placeholder="${config.searchPlaceholder || `Search...`}" class="p-2 rounded-lg bg-slate-700 border border-slate-600 focus:ring-2 focus:ring-blue-500">` : ''}
                    ${classFilter ? `<select id="class-filter" class="p-2 rounded-lg bg-slate-700 border border-slate-600 focus:ring-2 focus:ring-blue-500">${classFilterOptions.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}</select>` : ''}
                    
                    <!-- ACTION BUTTONS -->
                    <button id="bulk-select-btn" class="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-check-double"></i> Select</button>
                    ${!hideAddButton ? `<button id="add-new-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-plus"></i> Add New ${title}</button>` : ''}
                </div>
            </div>
            <div id="generic-list-container"></div>
        </div>
    `;

    renderTable(items);
    
    // --- EVENT LISTENERS FOR PAGE ACTIONS ---
    const addNewBtn = document.getElementById('add-new-btn');
    if (addNewBtn) {
        addNewBtn.onclick = () => {
            const addFunction = config.customAddFunction || (() => {
                openFormModal(`Add New ${title}`, formFields, async (formData) => {
                    await apiService.create(collectionName, formData);
                    showToast(`${title} added successfully!`, 'success');
                    renderGenericListPage(config);
                });
            });
            addFunction();
        };
    }
    
    document.getElementById('bulk-select-btn').onclick = () => {
        isSelectionMode = true;
        document.getElementById('add-new-btn')?.classList.add('hidden');
        document.getElementById('bulk-select-btn').classList.add('hidden');
        renderTable(currentItems);
    };

    document.getElementById('cancel-selection-btn').onclick = () => {
        isSelectionMode = false;
        selectedIds.clear();
        document.getElementById('add-new-btn')?.classList.remove('hidden');
        document.getElementById('bulk-select-btn').classList.remove('hidden');
        renderTable(currentItems);
    };
    
    document.getElementById('delete-selected-btn').onclick = () => {
        showConfirmationModal(`Are you sure you want to permanently delete these ${selectedIds.size} items?`, async () => {
            const result = await apiService.bulkRemove(collectionName, Array.from(selectedIds));
            if (result && result.success) {
                showToast(result.message, 'success');
                // Manually trigger cancel to reset the UI state
                document.getElementById('cancel-selection-btn').click(); 
                renderGenericListPage(config);
            }
        });
    };

    const handleFilter = () => {
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
        const classFilterValue = document.getElementById('class-filter')?.value || '';
        const roleFilterValue = document.getElementById('role-filter')?.value || '';

        let filteredItems = [...originalItems];

        if (searchTerm && searchKeys?.length > 0) {
            filteredItems = filteredItems.filter(item => 
                searchKeys.some(key => item[key] && String(item[key]).toLowerCase().includes(searchTerm))
            );
        }
        if (classFilterValue) {
            filteredItems = filteredItems.filter(item => item.classId === classFilterValue);
        }
        if (roleFilterValue) {
             filteredItems = filteredItems.filter(item => item.role === roleFilterValue);
        }
        currentItems = filteredItems; // Update the current view
        renderTable(filteredItems);
    };

    if (config.search) document.getElementById('search-input').oninput = handleFilter;
    if (classFilter) document.getElementById('class-filter').onchange = handleFilter;
    if (document.getElementById('role-filter')) document.getElementById('role-filter').onchange = handleFilter;
}