import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { showToast } from '../utils/helpers.js';
import { openFormModal, openBulkInsertModal, showConfirmationModal } from '../utils/helpers.js';
export async function renderExamsPage() {
    // ডেটাবেস থেকে সর্বশেষ তথ্য আনা হচ্ছে
    await Promise.all([
        store.refresh('exams'),
        store.refresh('results'),
        store.refresh('departments'),
        store.refresh('subjects'),
        store.refresh('sections'),
        store.refresh('teachers'),
        store.refresh('students') // <-- ছাত্রছাত্রীদের তালিকা আনার জন্য যোগ করা হয়েছে
    ]);

    let allExams = store.get('exams');
    const allResults = store.get('results');
    const allSections = store.get('sections');
    const allTeachers = store.get('teachers');
    const PASS_PERCENTAGE = 40; // পাস করার জন্য প্রয়োজনীয় নম্বর

    // --- ছাত্রছাত্রীদের জন্য নতুন এবং উন্নত ভিউ ---
    if (currentUser.role === 'Student') {
        const myExams = allExams
            .filter(e => e.sectionId && e.sectionId.id === currentUser.sectionId)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // পরীক্ষার তারিখ অনুযায়ী সাজানো

        ui.contentArea.innerHTML = `
            <div class="animate-fade-in space-y-8">
                <div class="relative overflow-hidden p-6 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-2xl shadow-xl border border-blue-800/30 backdrop-blur-sm">
                    <div class="relative z-10">
                        <h2 class="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                            <i class="fas fa-award text-blue-300"></i> My Exams & Results
                        </h2>
                        <p class="text-blue-100/80">Schedules for upcoming exams and analysis of past results.</p>
                    </div>
                </div>

                ${myExams.length > 0 ? myExams.map(exam => {
                    const resultsForThisExam = allResults.filter(r => r.examId._id === exam.id);
                    const hasResults = resultsForThisExam.length > 0;
                    const isPastExam = new Date(exam.date) < new Date();

                    // ফলাফল থাকলে Overall Percentage হিসাব করা
                    let overallPercentage = 0;
                    let isPass = false;
                    if (hasResults) {
                        const marksObtained = resultsForThisExam[0]?.marks || 0; // একটি পরীক্ষার জন্য একটিই ফলাফল ধরা হচ্ছে
                        const maxMarks = exam.maxMarks || 100;
                        overallPercentage = maxMarks > 0 ? ((marksObtained / maxMarks) * 100).toFixed(1) : 0;
                        isPass = overallPercentage >= PASS_PERCENTAGE;
                    }

                    // প্রতিটি পরীক্ষার জন্য একটি করে কার্ড তৈরি করা
                    return `
                    <div class="bg-gradient-to-br from-slate-800/60 to-slate-900/70 p-6 rounded-2xl border border-slate-700/50 shadow-lg">
                        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <!-- পরীক্ষার সময়সূচী এবং তথ্য -->
                            <div class="flex-grow">
                                <h3 class="text-xl font-semibold text-white">${exam.name}</h3>
                                <p class="text-sm text-slate-400 mt-1">
                                    Date: ${new Date(exam.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    <span class="mx-2">|</span>
                                    Time: ${exam.time || 'N/A'}
                                </p>
                                <p class="text-sm text-blue-300 font-medium">Subject: ${exam.subjectId?.name || 'N/A'}</p>
                            </div>

                            <!-- পরীক্ষার স্ট্যাটাস -->
                            <div class="flex-shrink-0 text-center bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700 w-full md:w-auto">
                                <p class="text-xs text-slate-400">Status</p>
                                ${hasResults ? `
                                    <p class="text-xl font-bold ${isPass ? 'text-green-400' : 'text-rose-400'}">${overallPercentage}%</p>
                                ` : `
                                    <p class="text-base font-medium ${isPastExam ? 'text-yellow-400' : 'text-blue-400'}">
                                        ${isPastExam ? 'Results Pending' : 'Upcoming'}
                                    </p>
                                `}
                            </div>
                        </div>
                        
                        <!-- ফলাফল উপলভ্য থাকলে টেবিল দেখানো -->
                        ${hasResults ? `
                            <div class="overflow-x-auto custom-scrollbar border-t border-slate-700/50 pt-4 mt-4">
                               <table class="min-w-full text-sm">
                                    <thead class="bg-slate-700/50">
                                        <tr>
                                            <th class="px-4 py-2 text-left font-medium text-slate-400">Marks Obtained</th>
                                            <th class="px-4 py-2 text-left font-medium text-slate-400">Max Marks</th>
                                            <th class="px-4 py-2 text-left font-medium text-slate-400">Grade</th>
                                            <th class="px-4 py-2 text-left font-medium text-slate-400">Comments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${resultsForThisExam.map(res => `
                                            <tr class="hover:bg-slate-700/30">
                                                <td class="px-4 py-3 font-semibold text-white">${res.marks}</td>
                                                <td class="px-4 py-3">${exam.maxMarks}</td>
                                                <td class="px-4 py-3 font-bold ${(res.marks / exam.maxMarks * 100) >= PASS_PERCENTAGE ? 'text-green-400' : 'text-red-400'}">
                                                    ${(res.marks / exam.maxMarks * 100) >= PASS_PERCENTAGE ? 'Pass' : 'Fail'}
                                                </td>
                                                <td class="px-4 py-3 text-slate-300">${res.comments || 'N/A'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                               </table>
                            </div>
                        ` : ''}
                    </div>`;
                }).join('') : `
                <div class="text-center p-16 bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-700">
                    <i class="fas fa-calendar-times fa-3x text-slate-500 mb-4"></i>
                    <h3 class="text-2xl font-bold text-white">No Exams Scheduled</h3>
                    <p class="text-slate-400 mt-2">Your teachers have not published any exam schedules for your section yet.</p>
                </div>`}
            </div>`;
        return;
    }

    // --- শিক্ষক এবং অ্যাডমিন এর জন্য UI ---
    const openExamForm = (exam = {}) => {
        const isEditing = !!exam.id;
        const sectionOptions = allSections.reduce((acc, section) => {
            const deptName = section.subjectId?.departmentId?.name || 'Uncategorized';
            if (!acc[deptName]) acc[deptName] = [];
            acc[deptName].push(`<option value="${section.id}" data-subjectid="${section.subjectId.id}" ${exam.sectionId?.id === section.id ? 'selected' : ''}>${section.subjectId.name} - Section ${section.name}</option>`);
            return acc;
        }, {});
        const sectionOptionsHtml = Object.entries(sectionOptions).map(([deptName, options]) => `<optgroup label="${deptName}">${options.join('')}</optgroup>`).join('');
        const teacherOptionsHtml = allTeachers.map(teacher => `<option value="${teacher.id}" ${exam.teacherId?.id === teacher.id ? 'selected' : ''}>${teacher.name}</option>`).join('');

        const formFields = [
            { name: 'name', label: 'Exam Name', type: 'text', required: true, value: exam.name || '' },
            { name: 'sectionId', label: 'Section & Subject', type: 'select', options: sectionOptionsHtml, required: true, id: 'exam-section-select' },
            { name: 'subjectId', type: 'hidden', value: exam.subjectId?.id || '' },
            { name: 'teacherId', label: 'Supervising Teacher', type: 'select', options: teacherOptionsHtml, required: true },
            { name: 'date', label: 'Date', type: 'date', required: true, value: exam.date ? exam.date.slice(0, 10) : '' },
            { name: 'time', label: 'Time', type: 'time', required: true, value: exam.time || '' },
            { name: 'maxMarks', label: 'Max Marks', type: 'number', required: true, value: exam.maxMarks || '' },
        ];
        
        const onSubmit = async (formData) => {
            let success = false;
            if (isEditing) {
                if (await apiService.update('exams', exam.id, formData)) {
                    showToast('Exam updated successfully!', 'success');
                    success = true;
                }
            } else {
                if (await apiService.create('exams', formData)) {
                    showToast('Exam created successfully!', 'success');
                    success = true;
                }
            }
            if (success) renderExamsPage();
        };

        openFormModal(isEditing ? 'Edit Exam Schedule' : 'Create New Exam Schedule', formFields, onSubmit, exam);
        
        const sectionSelect = document.getElementById('exam-section-select');
        const subjectInput = document.querySelector('input[name="subjectId"]');
        if (sectionSelect && subjectInput) {
            const updateSubject = () => {
                const selectedOption = sectionSelect.options[sectionSelect.selectedIndex];
                if (selectedOption) subjectInput.value = selectedOption.dataset.subjectid;
            };
            sectionSelect.addEventListener('change', updateSubject);
            updateSubject();
        }
    };
    
    // --- Exam Schedule Tab এর জন্য UI এবং Listeners ---
    const renderExamScheduleTab = () => {
        const container = document.getElementById('exam-schedule');
        const relevantExams = (currentUser.role === 'Admin') 
            ? allExams 
            : allExams.filter(e => e.teacherId?.id === currentUser.teacherId);
        container.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div><h3 class="text-2xl font-bold text-white">Exam Schedules</h3><p class="text-slate-400 mt-1">All upcoming and past examinations</p></div>
                <button id="add-exam-btn" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] group"><div class="relative"><i class="fas fa-plus transition-all group-hover:rotate-90"></i></div> Create New Schedule</button>
            </div>
            <div class="grid grid-cols-1 gap-4">
                ${relevantExams.length > 0 ? relevantExams.map(createPremiumExamCard).join('') : `<div class="text-center py-16 bg-gradient-to-br from-slate-800/30 to-slate-900/40 rounded-2xl border-2 border-dashed border-slate-700/50"><div class="inline-flex items-center justify-center w-20 h-20 bg-slate-800/50 rounded-full mb-4"><i class="fas fa-calendar-plus text-3xl text-blue-400"></i></div><h3 class="mt-2 text-2xl font-bold text-white">No Exams Scheduled</h3><p class="text-slate-400 mt-2">Create your first exam schedule to get started</p><button id="add-first-exam-btn" class="mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-all">Create Exam Schedule</button></div>`}
            </div>`;
        document.getElementById('add-exam-btn')?.addEventListener('click', () => openExamForm());
        document.getElementById('add-first-exam-btn')?.addEventListener('click', () => openExamForm());
        document.querySelectorAll('.edit-exam-btn').forEach(btn => btn.addEventListener('click', (e) => { const exam = allExams.find(ex => ex.id === e.currentTarget.dataset.id); if (exam) openExamForm(exam); }));
        document.querySelectorAll('.delete-exam-btn').forEach(btn => btn.addEventListener('click', (e) => { showConfirmationModal('Are you sure?', async () => { if (await apiService.remove('exams', e.currentTarget.dataset.id)) { showToast('Exam deleted.', 'success'); renderExamsPage(); } }); }));
    };

    const createPremiumExamCard = (exam) => {
        const subjectName = exam.subjectId?.name || 'N/A';
        const sectionName = exam.sectionId?.name || 'N/A';
        const departmentName = exam.sectionId?.subjectId?.departmentId?.name || 'N/A';
        const teacherName = exam.teacherId?.name || 'N/A';
        const eventDate = new Date(exam.date);
        const [hours, minutes] = exam.time.split(':');
        const formattedTime = `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
        const isPastExam = new Date(exam.date) < new Date();
        const hasResults = allResults.some(r => r.examId._id === exam.id);
        const statusText = isPastExam ? (hasResults ? 'Results Available' : 'Pending Results') : 'Upcoming';
        const statusColor = isPastExam ? (hasResults ? 'from-green-600/80 to-green-800/80' : 'from-amber-600/80 to-amber-800/80') : 'from-blue-600/80 to-blue-800/80';
        return `<div class="group relative bg-gradient-to-br from-slate-800/60 to-slate-900/70 p-5 rounded-2xl border border-slate-700/50 transition-all duration-300 hover:border-blue-600/50 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
            <div class="absolute top-0 right-0 bg-gradient-to-r ${statusColor} text-white text-xs font-bold px-3 py-1 rounded-bl-lg">${statusText}</div>
            <div class="flex flex-col md:flex-row gap-5">
                <div class="flex-shrink-0 flex flex-col items-center justify-center bg-slate-800/50 text-center rounded-xl p-3 border border-slate-700/50 w-20"><p class="text-xs text-slate-400 uppercase">${eventDate.toLocaleString('default', { weekday: 'short' })}</p><p class="font-bold text-2xl text-white my-1">${eventDate.getDate()}</p><p class="text-xs font-medium text-slate-300 uppercase">${eventDate.toLocaleString('default', { month: 'short' })} ${eventDate.getFullYear()}</p></div>
                <div class="flex-grow"><div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2"><div><h4 class="font-bold text-lg text-white">${exam.name}</h4><p class="text-sm text-blue-300">${subjectName}</p></div><div class="flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50"><i class="fas fa-clock text-slate-400 text-sm"></i><span class="text-sm font-medium text-white">${formattedTime}</span></div></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3"><div class="flex items-center gap-2 text-sm"><div class="w-6 h-6 rounded-md bg-slate-800/50 flex items-center justify-center text-slate-400"><i class="fas fa-layer-group text-xs"></i></div><span class="text-slate-300">${departmentName}</span></div><div class="flex items-center gap-2 text-sm"><div class="w-6 h-6 rounded-md bg-slate-800/50 flex items-center justify-center text-slate-400"><i class="fas fa-users text-xs"></i></div><span class="text-slate-300">Section ${sectionName}</span></div><div class="flex items-center gap-2 text-sm"><div class="w-6 h-6 rounded-md bg-slate-800/50 flex items-center justify-center text-slate-400"><i class="fas fa-user-tie text-xs"></i></div><span class="text-slate-300">${teacherName}</span></div><div class="flex items-center gap-2 text-sm"><div class="w-6 h-6 rounded-md bg-slate-800/50 flex items-center justify-center text-slate-400"><i class="fas fa-book-open text-xs"></i></div><span class="text-slate-300">Max Marks: ${exam.maxMarks}</span></div></div></div>
                <div class="flex md:flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><button class="edit-exam-btn text-white bg-blue-600/70 hover:bg-blue-600 w-8 h-8 rounded-lg transition-all flex items-center justify-center" data-id="${exam.id}" title="Edit"><i class="fas fa-edit text-sm"></i></button><button class="delete-exam-btn text-white bg-red-600/70 hover:bg-red-600 w-8 h-8 rounded-lg transition-all flex items-center justify-center" data-id="${exam.id}" title="Delete"><i class="fas fa-trash-alt text-sm"></i></button></div>
            </div></div>`;
    };

    // --- Results Entry Tab এর জন্য নতুন UI এবং Listeners ---
    const renderResultsEntryTab = () => {
        const container = document.getElementById('results-entry');
        const relevantExams = allExams.filter(e => new Date(e.date) < new Date() && (currentUser.role === 'Admin' || e.teacherId?.id === currentUser.teacherId));
        
        container.innerHTML = `
            <div class="space-y-6">
                <div>
                    <h3 class="text-2xl font-bold text-white">Results Entry</h3>
                    <p class="text-slate-400 mt-1">Select an exam to enter or update student marks.</p>
                </div>
                <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4">
                    <div class="flex flex-wrap items-center gap-4">
                        <label for="exam-for-results-select" class="font-medium">Select Exam:</label>
                        <select id="exam-for-results-select" class="p-2 rounded-lg bg-slate-700 border-slate-600 focus:ring-2 focus:ring-blue-500 flex-grow">
                            <option value="">-- Choose a past exam --</option>
                            ${relevantExams.map(e => `<option value="${e.id}">${e.name} - ${e.subjectId?.name} (Sec: ${e.sectionId?.name})</option>`).join('')}
                        </select>
                    </div>
                    <div id="results-sheet-container">
                        <p class="text-center text-slate-400 pt-4">Please select an exam to load the results sheet.</p>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('exam-for-results-select').addEventListener('change', (e) => {
            const examId = e.target.value;
            if (examId) loadResultsSheet(examId);
            else document.getElementById('results-sheet-container').innerHTML = `<p class="text-center text-slate-400 pt-4">Please select an exam to load the results sheet.</p>`;
        });
    };

    // --- পেজের মূল HTML এবং Tab এর কাঠামো ---
    ui.contentArea.innerHTML = `
        <div class="bg-gradient-to-br from-slate-900/50 to-slate-800/60 p-6 rounded-2xl border border-slate-700/70 shadow-2xl backdrop-blur-sm">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div><h2 class="text-3xl font-bold text-white flex items-center gap-3"><i class="fas fa-university text-blue-400"></i> Exam Management</h2><p class="text-slate-400 mt-1">Create schedules, enter results, and analyze performance</p></div>
            </div>
            <div class="flex flex-wrap border-b border-slate-700 mb-6 -mx-6 px-6 custom-scrollbar overflow-x-auto">
                <button class="tab-link flex-shrink-0 py-3 px-5 flex items-center gap-2 font-semibold border-b-2 transition-all duration-300 active text-blue-400 border-blue-400" data-tab="exam-schedule"><i class="fas fa-calendar-alt"></i> Exam Schedule</button>
                <button class="tab-link flex-shrink-0 py-3 px-5 flex items-center gap-2 font-semibold border-b-2 transition-all duration-300 text-slate-400 border-transparent" data-tab="results-entry"><i class="fas fa-marker"></i> Results Entry</button>
                <button class="tab-link flex-shrink-0 py-3 px-5 flex items-center gap-2 font-semibold border-b-2 transition-all duration-300 text-slate-400 border-transparent" data-tab="analysis"><i class="fas fa-chart-bar"></i> Performance Analysis</button>
            </div>
            <div id="exam-schedule" class="tab-content animate-fade-in"></div>
            <div id="results-entry" class="tab-content hidden animate-fade-in"></div>
            <div id="analysis" class="tab-content hidden animate-fade-in"></div>
        </div>`;
    
    // --- প্রতিটি Tab রেন্ডার করা এবং Listener যুক্ত করা ---
    renderExamScheduleTab();
    renderResultsEntryTab();
    // renderAnalysisTab(); // ভবিষ্যতে অ্যানালাইসিস ট্যাবের জন্য

    document.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabButton = e.currentTarget;
            document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active', 'text-blue-400', 'border-blue-400'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            tabButton.classList.add('active', 'text-blue-400', 'border-blue-400');
            document.getElementById(tabButton.dataset.tab).classList.remove('hidden');
        });
    });
}

export function loadResultsSheet(examId) {
    const container = document.getElementById('results-sheet-container');
    container.innerHTML = `
        <div class="bg-gradient-to-br from-slate-800/60 to-slate-900/70 p-6 rounded-2xl border border-slate-700/50 shadow-lg">
            <div class="flex justify-between items-center mb-6">
                <h4 class="text-xl font-bold text-white">Results Entry Sheet</h4>
                <button class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <i class="fas fa-save"></i> Save All
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-slate-800/70">
                        <tr>
                            <th class="p-3 text-left">Student ID</th>
                            <th class="p-3 text-left">Name</th>
                            <th class="p-3 text-left">Marks Obtained</th>
                            <th class="p-3 text-left">Comments</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-700/50">
                        <tr>
                            <td class="p-3">ST001</td>
                            <td class="p-3 font-medium">John Doe</td>
                            <td class="p-3"><input type="number" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-20" value="85"></td>
                            <td class="p-3"><input type="text" class="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 w-full" placeholder="Comments..."></td>
                        </tr>
                        <!-- More rows would be generated dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
}