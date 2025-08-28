// frontend/src/pages/students.js

import { apiService } from "../apiService.js";
import { store } from "../store.js";
import { currentUser, ui } from "../ui.js";
import {
    closeAnimatedModal,
    debounce,
    generateInitialsAvatar, // Add this line
    openBulkInsertModal,
    openFormModal,
    showConfirmationModal,
    showToast,
} from "../utils/helpers.js";


export async function renderStudentsPage() {
    // --- State Management ---
    const state = {
        view: "departments", // 'departments', 'sections', or 'students'
        selectedDeptId: null,
        selectedDeptName: "",
        selectedSectionId: null,
        selectedSectionName: "",
        selectedSubjectName: "",
        searchQuery: "",
        sortConfig: { key: "name", direction: "asc" },
        isSelectionMode: false,
        selectedIds: new Set(), // store as strings for consistency
        advancedSearchOpen: false,
        searchFilters: {
            name: "",
            rollNo: "",
            email: "",
            guardianName: "",
            contact: ""
        }
    };

    // Helper to compare IDs safely (string/number agnostic)
    const idsEqual = (a, b) => String(a ?? "") === String(b ?? "");

    // --- Premium Loading UI ---
    ui.contentArea.innerHTML = `
        <div class="p-8 text-center">
            <div class="premium-loader">
                <div class="loader-spinner">
                    <div class="spinner-ring spinner-gradient-1"></div>
                    <div class="spinner-ring spinner-gradient-2"></div>
                    <div class="spinner-ring spinner-gradient-3"></div>
                </div>
                <p class="mt-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 font-semibold">Loading premium student data...</p>
            </div>
        </div>
    `;

    // --- Data Fetching ---
    try {
        await Promise.all([
            store.refresh("students"),
            store.refresh("sections"),
            store.refresh("subjects"),
            store.refresh("departments"),
            store.refresh("timetable"),
        ]);
    } catch (error) {
        showToast("Failed to load required data", "error");
        console.error("Data loading error:", error);
        ui.contentArea.innerHTML = `
            <div class="p-8 text-center">
                <div class="error-container bg-gradient-to-br from-red-900/30 to-red-800/20 p-6 rounded-xl border border-red-800/50">
                    <i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-3"></i>
                    <h3 class="text-xl font-semibold text-red-200">Error loading data</h3>
                    <p class="text-red-300/80 mt-2">Please try again later</p>
                </div>
            </div>`;
        return;
    }

    // --- Data Caching & Role-Based Filtering ---
    const allDepartments = store.get("departments");
    const allSections = store.get("sections");
    const allStudents = store.get("students");
    const timetable = store.get("timetable");

    let accessibleSections = allSections;
    let accessibleDepartments = allDepartments;

    if (currentUser.role === "Teacher") {
        const teacherSectionIds = new Set(
            timetable
                .filter((entry) => entry.teacherId?.id === currentUser.teacherId)
                .map((entry) => entry.sectionId?.id)
        );

        accessibleSections = allSections.filter((section) =>
            teacherSectionIds.has(section.id)
        );
        const accessibleDeptIds = new Set(
            accessibleSections.map((s) => s.subjectId?.departmentId?.id)
        );
        accessibleDepartments = allDepartments.filter((dept) =>
            accessibleDeptIds.has(dept.id)
        );
    } else if (currentUser.role !== "Admin") {
        showToast("Unauthorized access", "error");
        return; // Block access for other roles
    }

    // --- Premium UI Helpers ---
    const createPageHeader = (title, subtitle, backTarget = null) => {
        return `
        <div class="mb-6 p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 border border-indigo-700/30 rounded-2xl shadow-2xl relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-white/5 rounded-full"></div>
            <div class="absolute bottom-0 left-0 w-24 h-24 -ml-12 -mb-12 bg-pink-500/10 rounded-full"></div>
            
            <div class="flex items-center justify-between relative z-10">
                <div>
                    <h2 class="text-2xl font-bold text-white drop-shadow-md">${title}</h2>
                    <p class="text-indigo-200/90 mt-1">${subtitle}</p>
                </div>
                ${backTarget ? `
                <button data-target="${backTarget}" class="back-btn px-4 py-2 rounded-xl bg-indigo-700/40 hover:bg-indigo-600/60 text-white transition-all duration-300 hover:shadow-lg backdrop-blur-sm border border-indigo-500/30">
                    <i class="fas fa-chevron-left mr-2"></i>Back
                </button>`
                : ""
            }
            </div>
        </div>`;
    };

    const createEmptyState = (title, message) => {
        return `
        <div class="text-center py-16 col-span-full">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/10 to-blue-500/10 mb-4">
                <i class="fas fa-folder-open text-3xl text-purple-400"></i>
            </div>
            <h3 class="text-xl font-semibold text-white">${title}</h3>
            <p class="text-slate-400 mt-2">${message}</p>
        </div>`;
    };

    const renderPremiumSearchBar = (placeholder, value = "", isAdvanced = false) => {
        return `
        <div class="mb-6 relative">
            <div class="flex items-center gap-3">
                <div class="flex-1 relative">
                    <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400"></i>
                    <input type="text" id="search-input" 
                        class="w-full pl-12 pr-20 py-4 bg-slate-800/60 border border-indigo-600/30 rounded-2xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all backdrop-blur-sm" 
                        placeholder="${placeholder}" 
                        value="${value}">
                    ${value ? `
                    <button id="clear-search" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-purple-400 transition-colors">
                        <i class="fas fa-times-circle"></i>
                    </button>` : ''}
                </div>
                ${isAdvanced ? `
                <button id="toggle-advanced-search" class="px-4 py-4 bg-gradient-to-r from-purple-600/40 to-blue-600/40 hover:from-purple-600/60 hover:to-blue-600/60 text-white rounded-2xl transition-all duration-300 hover:shadow-lg border border-indigo-500/30 backdrop-blur-sm">
                    <i class="fas fa-sliders-h"></i>
                </button>` : ''}
            </div>
            
            ${isAdvanced && state.advancedSearchOpen ? `
            <div class="mt-4 p-5 bg-slate-800/50 border border-indigo-600/30 rounded-2xl backdrop-blur-sm">
                <h4 class="text-white font-medium mb-3 flex items-center">
                    <i class="fas fa-filter text-purple-400 mr-2"></i> Advanced Filters
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm text-slate-300 mb-1">Name</label>
                        <input type="text" data-filter="name" value="${state.searchFilters.name}" 
                            class="w-full px-3 py-2 bg-slate-700/60 border border-indigo-600/20 rounded-xl text-white text-sm">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-300 mb-1">Roll No</label>
                        <input type="text" data-filter="rollNo" value="${state.searchFilters.rollNo}" 
                            class="w-full px-3 py-2 bg-slate-700/60 border border-indigo-600/20 rounded-xl text-white text-sm">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-300 mb-1">Email</label>
                        <input type="text" data-filter="email" value="${state.searchFilters.email}" 
                            class="w-full px-3 py-2 bg-slate-700/60 border border-indigo-600/20 rounded-xl text-white text-sm">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-300 mb-1">Guardian</label>
                        <input type="text" data-filter="guardianName" value="${state.searchFilters.guardianName}" 
                            class="w-full px-3 py-2 bg-slate-700/60 border border-indigo-600/20 rounded-xl text-white text-sm">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-300 mb-1">Contact</label>
                        <input type="text" data-filter="contact" value="${state.searchFilters.contact}" 
                            class="w-full px-3 py-2 bg-slate-700/60 border border-indigo-600/20 rounded-xl text-white text-sm">
                    </div>
                    <div class="flex items-end">
                        <button id="apply-filters" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm transition-all hover:shadow-lg">
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>` : ''}
        </div>`;
    };


    // --- Department View ---
    const renderDepartmentGrid = (departmentsToRender) => {
        const grid = document.getElementById("department-grid");
        if (!grid) return;
        grid.innerHTML = departmentsToRender.length > 0 ? departmentsToRender.map((dept, index) => {
            const colors = ["from-purple-600/20 to-purple-800/30", "from-blue-600/20 to-blue-800/30", "from-teal-600/20 to-teal-800/30", "from-pink-600/20 to-pink-800/30"];
            const iconColors = ["text-purple-400", "text-blue-400", "text-teal-400", "text-pink-400"];
            return `<div class="department-card p-5 bg-gradient-to-br ${colors[index % 4]} border border-slate-700/30 rounded-2xl cursor-pointer transform hover:scale-[1.03] transition-all duration-300 hover:shadow-xl backdrop-blur-sm" data-id="${dept.id}" data-name="${dept.name}"><div class="flex items-center"><div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mr-4 backdrop-blur-sm"><i class="fas fa-building ${iconColors[index % 4]} text-xl"></i></div><div><h3 class="font-bold text-white">${dept.name}</h3><p class="text-sm text-slate-300/90">${dept.studentCount} Students</p></div></div></div>`;
        }).join("") : createEmptyState("No Departments Found", "There are no departments matching your search.");

        document.querySelectorAll(".department-card").forEach(card => card.addEventListener("click", () => {
            state.view = "sections";
            state.selectedDeptId = card.dataset.id;
            state.selectedDeptName = card.dataset.name;
            state.searchQuery = "";
            mainRender();
        }));
    };

    const renderDepartmentView = () => {
        ui.contentArea.innerHTML = `<div>${createPageHeader("Departments", "Select a department to view sections")}${renderPremiumSearchBar("Search departments...", state.searchQuery)}<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" id="department-grid"></div></div>`;

        const updateList = () => {
            let departmentsToRender = accessibleDepartments.map(dept => ({ ...dept, studentCount: allStudents.filter(s => idsEqual(s.sectionId?.subjectId?.departmentId?.id, dept.id)).length }));
            if (state.searchQuery) {
                departmentsToRender = departmentsToRender.filter(d => d.name.toLowerCase().includes(state.searchQuery.toLowerCase()));
            }
            renderDepartmentGrid(departmentsToRender);
        };

        updateList(); // Initial render

        document.getElementById("search-input")?.addEventListener("input", debounce((e) => { state.searchQuery = e.target.value; updateList(); }, 300));
        document.getElementById("clear-search")?.addEventListener("click", () => { state.searchQuery = ""; updateList(); });
    };

    const renderSectionGrid = (sectionsToRender) => {
        const grid = document.getElementById("section-grid");
        if (!grid) return;
        grid.innerHTML = sectionsToRender.length > 0 ? sectionsToRender.map((section, index) => {
            const colors = ["from-purple-600/20 to-purple-800/30", "from-blue-600/20 to-blue-800/30", "from-teal-600/20 to-teal-800/30", "from-pink-600/20 to-pink-800/30"];
            const iconColors = ["text-purple-400", "text-blue-400", "text-teal-400", "text-pink-400"];
            return `<div class="section-card p-5 bg-gradient-to-br ${colors[index % 4]} border border-slate-700/30 rounded-2xl cursor-pointer transform hover:scale-[1.03] transition-all duration-300 hover:shadow-xl backdrop-blur-sm" data-id="${section.id}" data-name="${section.name}" data-subject="${section.subjectId.name}"><div class="flex items-center"><div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mr-4 backdrop-blur-sm"><i class="fas fa-chalkboard-user ${iconColors[index % 4]} text-xl"></i></div><div><h3 class="font-bold text-white">${section.subjectId.name} - Sec ${section.name}</h3><p class="text-sm text-slate-300/90">${section.studentCount} Students</p></div></div></div>`;
        }).join("") : createEmptyState("No Sections Found", "There are no sections in this department.");

        document.querySelectorAll(".section-card").forEach(card => card.addEventListener("click", () => {
            state.view = "students";
            state.selectedSectionId = card.dataset.id;
            state.selectedSectionName = card.dataset.name;
            state.selectedSubjectName = card.dataset.subject;
            state.searchQuery = "";
            state.advancedSearchOpen = false;
            Object.keys(state.searchFilters).forEach(key => state.searchFilters[key] = "");
            mainRender();
        }));
    };

    const renderSectionView = () => {
        ui.contentArea.innerHTML = `<div>${createPageHeader(`Department of ${state.selectedDeptName}`, "Select a section to view students", "departments")}${renderPremiumSearchBar("Search sections...", state.searchQuery)}<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" id="section-grid"></div></div>`;

        const updateList = () => {
            let sectionsToRender = accessibleSections.filter(s => idsEqual(s.subjectId?.departmentId?.id, state.selectedDeptId)).map(section => ({ ...section, studentCount: allStudents.filter(s => idsEqual(s.sectionId?.id, section.id)).length }));
            if (state.searchQuery) {
                const q = state.searchQuery.toLowerCase();
                sectionsToRender = sectionsToRender.filter(s => s.name.toLowerCase().includes(q) || s.subjectId.name.toLowerCase().includes(q));
            }
            renderSectionGrid(sectionsToRender);
        };

        updateList(); // Initial render

        document.querySelector(".back-btn")?.addEventListener("click", () => { state.view = "departments"; state.searchQuery = ""; mainRender(); });
        document.getElementById("search-input")?.addEventListener("input", debounce((e) => { state.searchQuery = e.target.value; updateList(); }, 300));
        document.getElementById("clear-search")?.addEventListener("click", () => { state.searchQuery = ""; updateList(); });
    };


    // --- Shared: Action Bar Rendering ---
    const renderActionBar = () => {
        return `
            <button id="bulk-import-btn" class="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:shadow-lg flex items-center">
                <i class="fas fa-file-import mr-2"></i>Document
            </button>
            <button id="select-btn" class="px-4 py-3 bg-gradient-to-r ${state.isSelectionMode ? 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700' : 'from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800'} text-white rounded-xl transition-all duration-300 hover:shadow-lg flex items-center">
                <i class="fas ${state.isSelectionMode ? 'fa-times' : 'fa-check-square'} mr-2"></i>${state.isSelectionMode ? "Cancel" : "Select"}
            </button>
            ${state.isSelectionMode && state.selectedIds.size > 0 ? `
            <button id="delete-selected-btn" class="px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 hover:shadow-lg flex items-center">
                <i class="fas fa-trash mr-2"></i>Delete (${state.selectedIds.size})
            </button>` : ""}
            <button id="add-student-btn" class="px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 hover:shadow-lg flex items-center">
                <i class="fas fa-user-plus mr-2"></i>Add Student
            </button>`;
    };

    // --- Students: Helpers for List Rendering & Actions ---
    const updateSelectAllHeader = () => {
        const headerCb = document.getElementById("select-all-checkbox");
        if (!headerCb) return;
        const rowCbs = Array.from(document.querySelectorAll(".student-checkbox"));
        if (rowCbs.length === 0) {
            headerCb.checked = false;
            headerCb.indeterminate = false;
            return;
        }
        const checkedCount = rowCbs.filter(cb => cb.checked).length;
        headerCb.checked = checkedCount === rowCbs.length;
        headerCb.indeterminate = checkedCount > 0 && checkedCount < rowCbs.length;
    };

    const attachActionBarListeners = () => {
        document.getElementById("add-student-btn")?.addEventListener("click", () => openStudentForm(null));
        document.getElementById("bulk-import-btn")?.addEventListener("click", insertDocument);
        document.getElementById("select-btn")?.addEventListener("click", () => {
            state.isSelectionMode = !state.isSelectionMode;
            if (!state.isSelectionMode) state.selectedIds.clear();
            renderStudentTableView();
        });
        document.getElementById("delete-selected-btn")?.addEventListener("click", () => {
            const count = state.selectedIds.size;
            if (count === 0) return;
            showConfirmationModal(`Delete ${count} selected student${count > 1 ? "s" : ""}? This cannot be undone.`, async () => {
                try {
                    const ids = Array.from(state.selectedIds);
                    if (typeof apiService.bulkRemove === "function") {
                        await apiService.bulkRemove("students", ids);
                    } else {
                        // Fallback if bulkRemove is not available
                        for (const id of ids) {
                            await apiService.remove("students", id);
                        }
                    }
                    showToast(`${count} student${count > 1 ? "s" : ""} deleted successfully.`, "success");
                    state.isSelectionMode = false;
                    state.selectedIds.clear();
                    await store.refresh("students");
                    // Re-render current view to reflect changes
                    renderStudentTableView();
                } catch (error) {
                    console.error(error);
                    showToast("Failed to delete students.", "error");
                }
            });
        });
    };

    // Renders ONLY the table rows + row-level listeners
       const renderStudentList = (studentsToDisplay) => {
        const tableBody = document.getElementById('student-table-body');
        if (!tableBody) return;
        const countDisplay = document.getElementById('student-count-display');
        const totalStudentsInSection = allStudents.filter(s => idsEqual(s.sectionId?.id, state.selectedSectionId)).length;
        if (countDisplay) {
            countDisplay.textContent = `Showing ${studentsToDisplay.length} of ${totalStudentsInSection} students`;
        }

        if (studentsToDisplay.length === 0) {
            // ... (empty state logic is fine)
            return;
        }

        tableBody.innerHTML = studentsToDisplay.map((student, index) => {
            const rowColors = index % 2 === 0 ? "bg-slate-800/20 hover:bg-indigo-900/30" : "bg-slate-900/40 hover:bg-indigo-900/30";

            return `
                <tr class="border-b border-indigo-700/30 transition-all ${rowColors}">
                    ${state.isSelectionMode ? `<td class="p-4"><input type="checkbox" class="student-checkbox w-4 h-4 rounded bg-slate-800/60 border-indigo-600/30 accent-purple-500" data-id="${student.id}" ${state.selectedIds.has(String(student.id)) ? "checked" : ""}></td>` : ""}
                    <td class="p-4">
                        <div class="flex items-center gap-3">
                           
                                                   <img src="${student.profileImage || generateInitialsAvatar(student.name)}" 
                             alt="${student.name}" class="w-10 h-10 rounded-full object-cover">

                            <div>
                                <p class="font-semibold text-white">${student.name || 'N/A'}</p>
                                <a href="mailto:${student.email}" class="text-xs text-slate-400 hover:text-blue-400 transition-colors">${student.email || 'N/A'}</a>
                            </div>
                        </div>
                    </td>
                    <td class="p-4"><span class="px-2 py-1 bg-indigo-900/30 rounded-lg text-indigo-200">${student.rollNo}</span></td>
                    <td class="p-4">${student.guardianName || ""}</td>
                    <td class="p-4">${student.contact || ""}</td>
                    <td class="p-4">
                        <button class="edit-btn px-3 py-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 hover:from-purple-600/50 hover:to-blue-600/50 rounded-xl text-blue-300 hover:text-white transition-all border border-indigo-600/30" data-id="${student.id}">
                            <i class="fas fa-pen mr-1"></i> Edit
                        </button>
                    </td>
                </tr>`;
        }).join("");
        // Re-attach listeners for the new rows
        document.querySelectorAll(".edit-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const student = allStudents.find(s => idsEqual(s.id, btn.dataset.id));
                openStudentForm(student);
            });
        });

        document.querySelectorAll(".student-checkbox").forEach(cb => {
            cb.addEventListener("change", (e) => {
                const id = String(e.target.dataset.id);
                if (e.target.checked) state.selectedIds.add(id);
                else state.selectedIds.delete(id);

                // Update action bar + listeners
                const actionBar = document.getElementById('action-bar-container');
                if (actionBar) {
                    actionBar.innerHTML = renderActionBar();
                    attachActionBarListeners();
                }
                // Update header select-all state
                updateSelectAllHeader();
            });
        });

        // Update header select-all state after rendering all rows
        updateSelectAllHeader();
    };

    const updateStudentDisplay = () => {
        let studentsInSection = allStudents.filter(s => idsEqual(s.sectionId?.id, state.selectedSectionId));

        // Advanced Filters
        const hasActiveFilters = Object.values(state.searchFilters).some(val => val.trim() !== "");
        if (hasActiveFilters) {
            studentsInSection = studentsInSection.filter(student =>
                Object.entries(state.searchFilters).every(([key, value]) => {
                    if (!value.trim()) return true;
                    const valStr = String(student[key] ?? "").toLowerCase();
                    return valStr.includes(value.toLowerCase());
                })
            );
        }

        // Simple search
        if (state.searchQuery) {
            const searchTerms = state.searchQuery.toLowerCase().split(' ').filter(term => term.trim() !== '');
            if (searchTerms.length > 0) {
                studentsInSection = studentsInSection.filter(s => {
                    const data = [s.name, s.email, s.rollNo, s.guardianName, s.contact]
                        .map(v => String(v ?? "").toLowerCase())
                        .join(' ');
                    return searchTerms.every(term => data.includes(term));
                });
            }
        }

        // Sorting
        studentsInSection.sort((a, b) => {
            const valA = String(a[state.sortConfig.key] ?? "").toLowerCase();
            const valB = String(b[state.sortConfig.key] ?? "").toLowerCase();
            if (valA < valB) return state.sortConfig.direction === "asc" ? -1 : 1;
            if (valA > valB) return state.sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

        renderStudentList(studentsInSection);
    };

    // --- Student Table View ---
    const renderStudentTableView = () => {
        const getSortIcon = (key) => {
            if (state.sortConfig.key !== key) return 'fa-sort text-slate-500';
            if (state.sortConfig.direction === 'asc') return 'fa-sort-up text-purple-400';
            return 'fa-sort-down text-purple-400';
        };

        ui.contentArea.innerHTML = `
        <div>
            ${createPageHeader(`${state.selectedSubjectName} - Section ${state.selectedSectionName}`, `Manage student records`, "sections")}
            <div class="p-5 bg-gradient-to-b from-slate-800/60 to-slate-900/80 border border-indigo-700/30 rounded-2xl shadow-xl backdrop-blur-sm">
                <div class="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                    <div class="relative w-full md:w-2/5">
                        ${renderPremiumSearchBar("Search students...", state.searchQuery, true)}
                    </div>
                    <div id="action-bar-container" class="flex gap-3 flex-wrap"></div>
                </div>
                <p id="student-count-display" class="text-sm text-slate-400 mb-4"></p>
                <div class="overflow-x-auto rounded-2xl border border-indigo-700/30">
                    <table class="min-w-full bg-slate-800/60 text-sm text-left text-slate-300 backdrop-blur-sm">
                        <thead class="bg-indigo-900/40 text-xs text-slate-300 uppercase">
                            <tr>
                                ${state.isSelectionMode ? `<th scope="col" class="p-4"><input type="checkbox" id="select-all-checkbox" class="w-4 h-4 rounded bg-slate-800/60 border-indigo-600/30 accent-purple-500"></th>` : ""}
                                <th scope="col" class="p-4 cursor-pointer sortable-header hover:bg-indigo-800/30 transition-all" data-sort="name"><div class="flex items-center"><span>Name</span><i class="fas ${getSortIcon('name')} ml-2"></i></div></th>
                                <th scope="col" class="p-4 cursor-pointer sortable-header hover:bg-indigo-800/30 transition-all" data-sort="rollNo"><div class="flex items-center"><span>Roll No</span><i class="fas ${getSortIcon('rollNo')} ml-2"></i></div></th>
                                <th scope="col" class="p-4">Guardian</th>
                                <th scope="col" class="p-4">Contact</th>
                                <th scope="col" class="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="student-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>`;

        // Action bar
        const actionBar = document.getElementById('action-bar-container');
        if (actionBar) {
            actionBar.innerHTML = renderActionBar();
            attachActionBarListeners();
        }

        // Initial table render
        updateStudentDisplay();

        // Back navigation
        document.querySelector(".back-btn")?.addEventListener("click", () => { state.view = "sections"; mainRender(); });

        // Search input
        document.getElementById("search-input")?.addEventListener("input", debounce((e) => {
            state.searchQuery = e.target.value;
            updateStudentDisplay();
        }, 300));

        // Clear search
        document.getElementById("clear-search")?.addEventListener("click", () => {
            state.searchQuery = "";
            renderStudentTableView(); // re-render to also remove the clear button
        });

        // Advanced panel toggle
        document.getElementById("toggle-advanced-search")?.addEventListener("click", () => {
            state.advancedSearchOpen = !state.advancedSearchOpen;
            renderStudentTableView();
        });

        // Sort handlers
        document.querySelectorAll(".sortable-header").forEach(header => {
            header.addEventListener("click", () => {
                const sortKey = header.dataset.sort;
                if (state.sortConfig.key === sortKey) {
                    state.sortConfig.direction = state.sortConfig.direction === "asc" ? "desc" : "asc";
                } else {
                    state.sortConfig.key = sortKey;
                    state.sortConfig.direction = "asc";
                }
                updateStudentDisplay();
            });
        });

        // Apply advanced filters
        document.getElementById("apply-filters")?.addEventListener("click", () => {
            document.querySelectorAll('input[data-filter]').forEach(input => {
                state.searchFilters[input.dataset.filter] = input.value;
            });
            updateStudentDisplay();
        });

        // Select all checkbox
        document.getElementById("select-all-checkbox")?.addEventListener("change", (e) => {
            const isChecked = e.target.checked;
            document.querySelectorAll(".student-checkbox").forEach(cb => {
                cb.checked = isChecked;
                const id = String(cb.dataset.id);
                if (isChecked) state.selectedIds.add(id);
                else state.selectedIds.delete(id);
            });
            const actionBar = document.getElementById('action-bar-container');
            if (actionBar) {
                actionBar.innerHTML = renderActionBar();
                attachActionBarListeners();
            }
            updateSelectAllHeader();
        });
    };

   // in src/pages/students.js

// ... (keep all the existing code at the top of the file)

// --- THIS IS THE FUNCTION TO MODIFY ---
const openStudentForm = (studentData = null) => {
    const isEditing = !!studentData;
    const title = isEditing ? `Edit Student Profile` : "Add New Student";

    // ... (keep the logic for building formFields exactly as it is)
    const allDepartments = store.get("departments");
    const allSections = store.get("sections");
    let currentSectionId = studentData?.sectionId?.id || studentData?.sectionId;
    const currentSection = allSections.find(s => s.id === currentSectionId);
    let currentDeptId = currentSection?.subjectId?.departmentId?.id;
    const departmentOptionsHtml = allDepartments.map(dept =>
        `<option value="${dept.id}" ${dept.id === currentDeptId ? 'selected' : ''}>${dept.name}</option>`
    ).join('');
    const sectionOptionsHtml = allSections
        .filter(section => section.subjectId?.departmentId?.id === currentDeptId)
        .map(section =>
            `<option value="${section.id}" ${section.id === currentSectionId ? 'selected' : ''}>
            ${section.subjectId.name} - Section ${section.name}
        </option>`
        ).join('');
    const formFields = [
        { name: "name", label: "Full Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "rollNo", label: "Roll Number", type: "text", required: true },
        { name: "guardianName", label: "Guardian Name", type: "text", required: true },
        { name: 'department', label: 'Department', type: 'select', id: 'department-selector', options: departmentOptionsHtml },
        { name: 'sectionId', label: 'Section', type: 'select', id: 'sectionId', options: sectionOptionsHtml, required: true },
        { name: "contact", label: "Contact Number", type: "tel", required: true },
        { name: "dateOfBirth", label: "Date of Birth", type: "date" },
        { name: "gender", label: "Gender", type: "select", options: `<option>Male</option><option>Female</option><option>Other</option>` },
        { name: "address", label: "Address", type: "textarea" },
    ];
     if (!isEditing) {
        formFields.push({ name: "password", label: "Initial Password", type: "password", required: true });
    }
    // ... (keep the onSubmitHandler and onDeleteHandler logic as is)
    const onSubmitHandler = async (formData) => {
        delete formData.department;
        try {
            if (isEditing) {
                await apiService.update("students", studentData.id, formData);
                showToast("Student updated successfully!", "success");
            } else {
                const newStudent = await apiService.create("students", formData);
                if (!newStudent || !newStudent.id) {
                    showToast("Could not create student.", "error");
                    return;
                }
                await apiService.create("users", {
                    name: newStudent.name, email: newStudent.email, password: formData.password,
                    role: "Student", studentId: newStudent.id,
                });
                showToast("Student added successfully!", "success");
            }
            await store.refresh("students");
            closeAnimatedModal(ui.modal);
            mainRender(); 
        } catch (error) {
            showToast("Operation failed.", "error");
            console.error("Form submission error:", error);
        }
    };
    const onDeleteHandler = isEditing
        ? async () => {
            showConfirmationModal(`Delete ${studentData.name}? This will also delete their user account.`, async () => {
                try {
                    await apiService.remove("students", studentData.id);
                    showToast("Student deleted successfully", "success");
                    closeAnimatedModal(ui.modal);
                    await store.refresh("students");
                    renderStudentTableView();
                } catch (error) {
                    console.error(error);
                    showToast("Failed to delete student", "error");
                }
            });
        }
        : null;

    // --- THIS IS THE FIX ---
    // We create and pass a config object so the modal knows it's for a 'student'.
    const modalConfig = { collectionName: 'students', title: 'Student' };
    openFormModal(title, formFields, onSubmitHandler, studentData || {}, onDeleteHandler, modalConfig);
    // -------------------------

    // ... (keep the setTimeout for event listeners exactly as it is)
    setTimeout(() => {
        const departmentSelect = document.getElementById('department-selector');
        const sectionSelect = document.getElementById('sectionId');
        if (departmentSelect && sectionSelect) {
            departmentSelect.addEventListener('change', (e) => {
                const selectedDeptId = e.target.value;
                const relevantSections = allSections.filter(section => section.subjectId?.departmentId?.id === selectedDeptId);
                sectionSelect.innerHTML = relevantSections.map(section =>
                    `<option value="${section.id}">${section.subjectId.name} - Section ${section.name}</option>`
                ).join('');
            });
        }
    }, 100);
};

// ... (keep all other functions in the file, like mainRender, etc.)
    // --- Bulk Insert Function ---
    const insertDocument = () => {
        openBulkInsertModal(
            "students",
            "Students",
            ["name", "email", "password", "rollNo"],
            {
                name: "Test Student",
                email: "test@school.com",
                password: "Password123!",
                rollNo: "S-999",
                sectionId: state.selectedSectionId, // Auto-assign current section
                guardianName: "Parent Name",
                contact: "0123456789",
            }
        );
    };

    // --- Main Render Function ---
    const mainRender = () => {
        switch (state.view) {
            case "departments":
                renderDepartmentView();
                break;
            case "sections":
                renderSectionView();
                break;
            case "students":
                renderStudentTableView();
                break;
            default:
                renderDepartmentView();
        }
    };
    // Initialize
    mainRender();
}
