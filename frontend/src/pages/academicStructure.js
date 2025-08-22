import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { ui } from '../ui.js';
import { openFormModal, showConfirmationModal, getSkeletonLoaderHTML } from '../utils/helpers.js';
// ... rest of the file
export async function renderAcademicStructurePage() {
    // 1. Local state to manage the user's journey through the tabs
    let state = {
        activeTab: 'departments',
        selectedDept: null,
        selectedSubject: null,
        selectedSection: null,
    };

    // 2. Initial Data Fetch (run only once when the page loads)
    ui.contentArea.innerHTML = getSkeletonLoaderHTML('dashboard'); // Show a loader
    await Promise.all([
        store.refresh('departments'),
        store.refresh('subjects'),
        store.refresh('sections'),
        store.refresh('teachers'),
        store.refresh('timetable')
    ]);

    // 3. Main Render Function: This function will redraw the UI whenever the state changes
    const render = () => {
        // Get the latest data from the client-side store
        const allDepartments = store.get('departments');
        const allSubjects = store.get('subjects');
        const allSections = store.get('sections');
        const allTeachers = store.get('teachers');
        const allTimetable = store.get('timetable');

        // Main page structure with tabs
        const mainHtml = `
            <div class="animate-fade-in">
                <div class="academic-tabs-container">
                    <button class="academic-tab ${state.activeTab === 'departments' ? 'active' : ''}" data-tab="departments">Departments</button>
                    <button class="academic-tab ${state.activeTab === 'subjects' ? 'active' : ''}" data-tab="subjects" ${!state.selectedDept ? 'disabled' : ''}>Subjects</button>
                    <button class="academic-tab ${state.activeTab === 'sections' ? 'active' : ''}" data-tab="sections" ${!state.selectedSubject ? 'disabled' : ''}>Sections</button>
                    <button class="academic-tab ${state.activeTab === 'schedule' ? 'active' : ''}" data-tab="schedule" ${!state.selectedSection ? 'disabled' : ''}>Class Schedule</button>
                </div>
                <div id="academic-tab-content"></div>
            </div>`;
        ui.contentArea.innerHTML = mainHtml;
        const contentContainer = document.getElementById('academic-tab-content');

        // Logic to render content based on the active tab
        switch (state.activeTab) {
            case 'departments':
                renderDepartmentsTab(contentContainer, allDepartments);
                break;
            case 'subjects':
                const subjectsInDept = allSubjects.filter(s => s.departmentId?.id === state.selectedDept?.id);
                renderSubjectsTab(contentContainer, subjectsInDept, state.selectedDept);
                break;
            case 'sections':
                const sectionsInSubject = allSections.filter(s => s.subjectId?.id === state.selectedSubject?.id);
                renderSectionsTab(contentContainer, sectionsInSubject, state.selectedDept, state.selectedSubject, allTeachers);
                break;
            case 'schedule':
                const scheduleForSection = allTimetable.filter(t => t.sectionId?.id === state.selectedSection?.id);
                renderScheduleTab(contentContainer, scheduleForSection, state.selectedDept, state.selectedSubject, state.selectedSection, allTeachers);
                break;
        }
        attachEventListeners(); // Re-attach listeners after every render
    };

    // --- Helper functions to render content for each specific tab ---

    const renderDepartmentsTab = (container, departments) => {
        container.innerHTML = `
            <div class="academic-content-header">
                <h3 class="text-xl font-bold">All Departments</h3>
                <button id="add-dept-btn" class="btn-glow bg-sky-600 text-white font-bold py-2 px-4 rounded-lg">Add New Department</button>
            </div>
            <div class="space-y-3">
                ${departments.length > 0 ? departments.map(dept => `
                    <div class="academic-item" data-id="${dept.id}" data-type="department">
                        <div class="item-icon"><i class="fas fa-building"></i></div>
                        <div class="item-content"><p class="title">${dept.name}</p></div>
                        <div class="item-actions">
                            <button class="action-btn edit" title="Edit" data-action="edit-dept"><i class="fas fa-pen"></i></button>
                            <button class="action-btn delete" title="Delete" data-action="delete-dept"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`).join('') : '<div class="empty-state">No departments found.</div>'}
            </div>`;
    };

    const renderSubjectsTab = (container, subjects, department) => {
        container.innerHTML = `
            <div class="academic-content-header">
                <div>
                    <div class="breadcrumb-nav text-sm mb-1"><a href="#" data-tab="departments">Departments</a> &gt; <span>${department.name}</span></div>
                    <h3 class="text-xl font-bold">Subjects in ${department.name}</h3>
                </div>
                <button id="add-subject-btn" class="btn-glow bg-sky-600 text-white font-bold py-2 px-4 rounded-lg">Add New Subject</button>
            </div>
            <div class="space-y-3">
                ${subjects.length > 0 ? subjects.map(sub => `
                    <div class="academic-item" data-id="${sub.id}" data-type="subject">
                        <div class="item-icon"><i class="fas fa-book"></i></div>
                        <div class="item-content"><p class="title">${sub.name}</p></div>
                        <div class="item-actions">
                            <button class="action-btn delete" title="Delete" data-action="delete-subject"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`).join('') : '<div class="empty-state">No subjects found for this department.</div>'}
            </div>`;
    };

    const renderSectionsTab = (container, sections, department, subject, teachers) => {
        container.innerHTML = `
            <div class="academic-content-header">
                <div>
                    <div class="breadcrumb-nav text-sm mb-1"><a href="#" data-tab="departments">Departments</a> &gt; <a href="#" data-tab="subjects" data-id="${department.id}" data-type="department">${department.name}</a> &gt; <span>${subject.name}</span></div>
                    <h3 class="text-xl font-bold">Sections for ${subject.name}</h3>
                </div>
                <button id="add-section-btn" class="btn-glow bg-sky-600 text-white font-bold py-2 px-4 rounded-lg">Add New Section</button>
            </div>
            <div class="space-y-3">
                ${sections.length > 0 ? sections.map(sec => `
                    <div class="academic-item" data-id="${sec.id}" data-type="section">
                        <div class="item-icon"><i class="fas fa-users"></i></div>
                        <div class="item-content"><p class="title">Section ${sec.name}</p><p class="subtitle">Class Teacher: ${sec.classTeacherId?.name || 'Not Assigned'}</p></div>
                        <div class="item-actions">
                            <button class="action-btn delete" title="Delete" data-action="delete-section"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`).join('') : '<div class="empty-state">No sections found for this subject.</div>'}
            </div>`;
    };
    
    const renderScheduleTab = (container, schedule, department, subject, section, teachers) => {
        container.innerHTML = `
            <div class="academic-content-header">
                 <div>
                    <div class="breadcrumb-nav text-sm mb-1"><a href="#" data-tab="departments">Departments</a> &gt; <a href="#" data-tab="subjects" data-id="${department.id}" data-type="department">${department.name}</a> &gt; <a href="#" data-tab="sections" data-id="${subject.id}" data-type="subject">${subject.name}</a> &gt; <span>Section ${section.name}</span></div>
                    <h3 class="text-xl font-bold">Schedule for Section ${section.name}</h3>
                </div>
                <button id="add-schedule-btn" class="btn-glow bg-sky-600 text-white font-bold py-2 px-4 rounded-lg">Add New Class</button>
            </div>
            <div class="space-y-3">
                ${schedule.length > 0 ? schedule.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(item => `
                    <div class="academic-item schedule-item" data-id="${item.id}" data-type="schedule">
                        <div class="item-icon"><i class="fas fa-clock"></i></div>
                        <div class="item-content"><p class="title">${item.dayOfWeek} at ${item.startTime} - ${item.endTime}</p><p class="subtitle">Teacher: ${item.teacherId?.name || 'N/A'}</p></div>
                        <div class="item-actions">
                             <button class="action-btn delete" title="Delete" data-action="delete-schedule"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`).join('') : '<div class="empty-state">No schedule defined for this section.</div>'}
            </div>`;
    };

    // --- Centralized Event Handling ---
    const attachEventListeners = () => {
        // Tab switching
        document.querySelectorAll('.academic-tab, .breadcrumb-nav a').forEach(tab => {
            tab.onclick = (e) => {
                e.preventDefault();
                state.activeTab = e.currentTarget.dataset.tab;
                // Handle breadcrumb clicks to go back
                if (state.activeTab === 'subjects') state.selectedSubject = null;
                if (state.activeTab === 'departments') { state.selectedSubject = null; state.selectedDept = null; }
                render();
            };
        });

        // Item clicks for navigation
        document.querySelectorAll('.academic-item').forEach(item => {
            if (item.dataset.type === 'schedule') return; // Schedule items are not clickable
            item.addEventListener('click', (e) => {
                if (e.target.closest('.item-actions')) return; // Ignore clicks on action buttons
                const id = item.dataset.id;
                const type = item.dataset.type;
                if (type === 'department') {
                    state.selectedDept = store.get('departments').find(d => d.id === id);
                    state.activeTab = 'subjects';
                } else if (type === 'subject') {
                    state.selectedSubject = store.get('subjects').find(s => s.id === id);
                    state.activeTab = 'sections';
                } else if (type === 'section') {
                    state.selectedSection = store.get('sections').find(s => s.id === id);
                    state.activeTab = 'schedule';
                }
                render();
            });
        });

        // --- Admin Action Button Handlers ---
        document.getElementById('add-dept-btn')?.addEventListener('click', () => {
            openFormModal('Add New Department', [{ name: 'name', label: 'Department Name', required: true }], async (formData) => {
                if (await apiService.create('departments', formData)) { await store.refresh('departments'); render(); }
            });
        });
        document.getElementById('add-subject-btn')?.addEventListener('click', () => {
            openFormModal('Add New Subject', [{ name: 'name', label: 'Subject Name', required: true }], async (formData) => {
                if (await apiService.create('subjects', { ...formData, departmentId: state.selectedDept.id })) { await store.refresh('subjects'); render(); }
            });
        });
        document.getElementById('add-section-btn')?.addEventListener('click', () => {
            openFormModal('Add New Section', [
                { name: 'name', label: 'Section Name (e.g., A)', required: true },
                { name: 'classTeacherId', label: 'Class Teacher', type: 'select', options: `<option value="">-- Optional --</option>` + store.get('teachers').map(t => `<option value="${t.id}">${t.name}</option>`).join('') }
            ], async (formData) => {
                if (await apiService.create('sections', { ...formData, subjectId: state.selectedSubject.id })) { await store.refresh('sections'); render(); }
            });
        });
        document.getElementById('add-schedule-btn')?.addEventListener('click', () => {
            openFormModal('Add Schedule Slot', [
                { name: 'teacherId', label: 'Teacher', type: 'select', required: true, options: store.get('teachers').map(t => `<option value="${t.id}">${t.name}</option>`).join('') },
                { name: 'dayOfWeek', label: 'Day', type: 'select', required: true, options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => `<option value="${d}">${d}</option>`).join('') },
                { name: 'startTime', label: 'Start Time', type: 'time', required: true },
                { name: 'endTime', label: 'End Time', type: 'time', required: true },
            ], async (formData) => {
                if (await apiService.create('timetable', { ...formData, sectionId: state.selectedSection.id, subjectId: state.selectedSubject.id })) { await store.refresh('timetable'); render(); }
            });
        });

        // Edit/Delete handlers
        document.querySelectorAll('.item-actions .action-btn').forEach(btn => {
            const itemElement = btn.closest('.academic-item');
            const id = itemElement.dataset.id;
            const action = btn.dataset.action;

            btn.onclick = () => {
                switch (action) {
                    case 'delete-dept':
                        showConfirmationModal('Delete this department and ALL its subjects and sections?', async () => {
                            if (await apiService.remove('departments', id)) { await store.initialize(); state = { activeTab: 'departments', selectedDept: null, selectedSubject: null, selectedSection: null }; render(); }
                        });
                        break;
                    case 'delete-subject':
                        showConfirmationModal('Delete this subject and ALL its sections?', async () => {
                            if (await apiService.remove('subjects', id)) { await store.refresh('subjects'); await store.refresh('sections'); state.selectedSubject = null; state.activeTab = 'subjects'; render(); }
                        });
                        break;
                    case 'delete-section':
                         showConfirmationModal('Delete this section?', async () => {
                            if (await apiService.remove('sections', id)) { await store.refresh('sections'); state.selectedSection = null; state.activeTab = 'sections'; render(); }
                        });
                        break;
                     case 'delete-schedule':
                         showConfirmationModal('Delete this schedule slot?', async () => {
                            if (await apiService.remove('timetable', id)) { await store.refresh('timetable'); render(); }
                        });
                        break;
                }
            };
        });
    };

    // Initial Render
    render();
}