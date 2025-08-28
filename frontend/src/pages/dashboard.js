// in frontend/src/pages/dashboard.js

import { renderStudentsPage } from './students.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
// --- THIS IS THE FIX: Added openAdvancedMessageModal to the import list ---
import { calculateOverdueDays, createDashboardCard, createNoticeCard, createUpcomingExamCard, openAdvancedMessageModal, renderDashboardCharts } from '../utils/helpers.js';

export const renderDashboard = async () => {
    // Proactively refresh data needed for the dashboard
    await Promise.all([
        store.refresh('users'),
        store.refresh('students'),
        store.refresh('fees'),
        store.refresh('exams'),
        store.refresh('notices'),
        store.refresh('library', 'transactions'),
        store.refresh('sections'), // Ensure sections are fresh
        store.refresh('timetable') // Ensure timetable is fresh
    ]);

    // Get all necessary data maps for efficient lookups
    const classesMap = store.getMap('classes');
    const subjectsMap = store.getMap('subjects');
    const teachersMap = store.getMap('teachers');
    const allNotices = store.get('notices');

    // STUDENT DASHBOARD
    if (currentUser.role === 'Student') {
        const fees = store.get('fees');
        const exams = store.get('exams');
        
        const pendingFeesCount = fees.filter(f => {
            if (!f.studentId || !f.studentId._id) return false;
            return f.studentId._id === currentUser.studentId && f.status === 'Unpaid';
        }).length;

        const upcomingExams = exams
            .filter(e => e.sectionId?.id === currentUser.sectionId && new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        const relevantNotices = allNotices.filter(n => 
            n.target && ['All', 'Student', `section_${currentUser.sectionId}`, currentUser.id].includes(n.target)
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
        const overdueBooksCount = store.get('library', 'transactions')
            .filter(t => t.memberId === currentUser.id && calculateOverdueDays(t.dueDate) > 0).length;

        const studentStatCards = [
            { title: 'Upcoming Exams', value: upcomingExams.length, icon: 'fa-file-alt', color: 'indigo' },
            { title: 'Pending Fees', value: pendingFeesCount, icon: 'fa-file-invoice-dollar', color: 'yellow' },
            { title: 'Overdue Books', value: overdueBooksCount, icon: 'fa-exclamation-triangle', color: 'red' },
        ];

        ui.contentArea.innerHTML = `
            <div class="animate-fade-in">
                <div class="mb-6">
                    <h2 class="text-3xl md:text-4xl font-extrabold text-white leading-tight">Welcome back, <span class="text-blue-400">${currentUser.name.split(' ')[0]}!</span></h2>
                    <p class="text-slate-400 mt-2">Here's your personalized summary for today.</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">${studentStatCards.map(createDashboardCard).join('')}</div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700">
                        <h3 class="text-xl font-semibold mb-4 text-white">Recent Notices</h3>
                        <div class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                            ${relevantNotices.length > 0 ? relevantNotices.slice(0, 4).map(n => createNoticeCard(n, teachersMap.get(n.authorId)?.name ?? 'School Admin')).join('') : '<p class="text-slate-500 italic">No recent notices to display.</p>'}
                        </div>
                    </div>
                    <div class="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700">
                        <h3 class="text-xl font-semibold mb-4 text-white">Upcoming Exams</h3>
                        <div class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                            ${upcomingExams.length > 0 ? upcomingExams.slice(0, 4).map(e => createUpcomingExamCard(e)).join('') : '<p class="text-slate-500 italic">No upcoming exams scheduled.</p>'}
                        </div>
                    </div>  
                </div>
            </div>`;
            
    // TEACHER DASHBOARD
    } else if (currentUser.role === 'Teacher') {
        const students = store.get('students');
        const exams = store.get('exams');
        const timetable = store.get('timetable');
        const allSections = store.get('sections');

        // =========================================================================
        // --- THIS IS THE FIX: Replaced the flawed logic with the correct one ---
        // =========================================================================
        // This logic is now identical to renderStudentsPage to ensure consistency.
        const mySectionIds = new Set();

        // 1. Find sections where the teacher is the main "Class Teacher"
        allSections.forEach(section => {
            if (section.classTeacherId?.id === currentUser.teacherId) {
                mySectionIds.add(section.id);
            }
        });

        // 2. Find sections where the teacher has classes according to the timetable
        timetable.forEach(entry => {
            if (entry.teacherId?.id === currentUser.teacherId) {
                if (entry.sectionId?.id) { // Ensure the section ID exists
                    mySectionIds.add(entry.sectionId.id);
                }
            }
        });

        // 3. Filter the student list to include only students from those sections
        const myStudents = students.filter(student => 
            student.sectionId?.id && mySectionIds.has(student.sectionId.id)
        );
        // =========================================================================
        // --- END OF FIX ---
        // =========================================================================

        const upcomingExams = exams.filter(e => e.teacherId?.id === currentUser.teacherId && new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = daysOfWeek[new Date().getDay()];
        const todaysClasses = timetable
            .filter(t => t.teacherId?.id === currentUser.teacherId && t.dayOfWeek === today)
            .sort((a,b) => a.startTime.localeCompare(b.startTime));
        const relevantNotices = allNotices
            .filter(n => ['All', 'Teacher', 'Staff', currentUser.id].includes(n.target) || n.authorId === currentUser.id)
            .sort((a,b) => new Date(b.date) - new Date(a.date));

        const statCards = [
            // The 'value' for these cards now uses the correctly calculated data
            { title: 'My Students', value: myStudents.length, icon: 'fa-user-graduate', color: 'blue' },
            { title: 'My Classes', value: mySectionIds.size, icon: 'fa-school', color: 'green' },
            { title: 'Upcoming Exams', value: upcomingExams.length, icon: 'fa-file-alt', color: 'yellow' },
            { title: "Today's Classes", value: todaysClasses.length, icon: 'fa-calendar-day', color: 'indigo' },
        ];
        
        ui.contentArea.innerHTML = `
            <div class="animate-fade-in">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${statCards.map(createDashboardCard).join('')}</div>
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-1 bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700">
                        <h3 class="text-xl font-semibold mb-4 text-white">Today's Timetable (<span class="text-blue-400">${today}</span>)</h3>
                        <div class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                            ${todaysClasses.length > 0 ? todaysClasses.map(c => {
                                const subjectName = c.subjectId?.name || 'N/A';
                                const sectionName = c.sectionId?.name || 'N/A';
                                const departmentName = c.sectionId?.subjectId?.departmentId?.name || 'N/A';
                                return `
                                <div class="flex items-center gap-4 p-3 rounded-lg bg-slate-700/50">
                                    <div class="text-center font-semibold bg-blue-900/50 text-blue-300 rounded-lg px-3 py-1 min-w-[70px]"><p>${c.startTime}</p></div>
                                    <div><p class="font-bold text-white">${subjectName}</p><p class="text-sm text-slate-400">${departmentName} - Section ${sectionName}</p></div>
                                </div>`
                            }).join('') : `<p class="text-slate-500 italic text-center py-4">No classes scheduled for today.</p>`}
                        </div>
                    </div>
                    <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700 flex flex-col">
                            <h3 class="text-xl font-semibold mb-4 text-white">Recent Notices</h3>
                            <div class="flex-grow space-y-3 max-h-80 overflow-y-auto custom-scrollbar mb-4">
                                 ${relevantNotices.length > 0 ? relevantNotices.slice(0, 5).map(n => createNoticeCard(n, teachersMap.get(n.authorId)?.name ?? 'School Admin')).join('') : `<p class="text-slate-500 italic">No new notices.</p>`}
                            </div>
                            <div class="mt-auto border-t border-slate-700 pt-4">
                                <button id="quick-message-btn" class="w-full text-center p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition duration-300"><i class="fas fa-paper-plane mr-2"></i>New Notice / Message</button>
                            </div>
                        </div>
                        <div class="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700 flex flex-col justify-center items-center">
                            <h3 class="text-xl font-semibold mb-4 text-white">Student Gender Distribution</h3>
                            ${myStudents.length > 0 ? `<canvas id="genderChart"></canvas>` : `<p class="text-slate-500 italic text-center py-4">No student data to display a chart.</p>`}
                        </div>
                    </div>
                </div>
            </div>`;

        document.getElementById('quick-message-btn')?.addEventListener('click', openAdvancedMessageModal);
        if(myStudents.length > 0) renderDashboardCharts(null, myStudents);
    
    // ADMIN DASHBOARD
    } else {
        const students = store.get('students');
        const fees = store.get('fees');
        const exams = store.get('exams');
        const totalStaffCount = store.get('users').filter(user => user.role !== 'Student').length;
        
        const statCards = [
            { title: 'Total Students', value: students.length, icon: 'fa-user-graduate', color: 'blue' },
            { title: 'Total Staff', value: totalStaffCount, icon: 'fa-users-cog', color: 'green' },
            { title: 'Total Fees Due', value: `BDT ${fees.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0).toLocaleString()}`, icon: 'fa-file-invoice-dollar', color: 'yellow' },
            { title: 'Books on Loan', value: store.get('library', 'transactions').filter(t => t.status === 'Issued' || t.status === 'Overdue').length, icon: 'fa-book', color: 'indigo' },
        ];
        const upcomingExams = exams.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));

        ui.contentArea.innerHTML = `
            <div class="animate-fade-in">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">${statCards.map(createDashboardCard).join('')}</div>
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700">
                        <h3 class="text-xl font-semibold mb-4 text-white">Fee Collection Overview (All Time)</h3>
                        ${fees.length > 0 ? '<canvas id="feesChart"></canvas>' : '<p class="text-slate-500 italic text-center py-4">No fee data to display a chart.</p>'}
                    </div>
                    <div class="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700">
                        <h3 class="text-xl font-semibold mb-4 text-white">Student Body Distribution</h3>
                         ${students.length > 0 ? '<canvas id="genderChart"></canvas>' : '<p class="text-slate-500 italic text-center py-4">No student data to display a chart.</p>'}
                    </div>
                </div>
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700">
                         <h3 class="text-xl font-semibold mb-4 text-white">Quick Communication</h3>
                         <p class="text-slate-400 mb-4">Send a notice or direct message to any group or individual in the school.</p>
                         <button id="admin-send-message-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg"><i class="fas fa-paper-plane mr-2"></i> Send a Message / Notice</button>
                    </div>
                    <div class="bg-slate-800/50 p-6 rounded-xl shadow-xl border border-slate-700">
                        <h3 class="text-xl font-semibold mb-4 text-white">Upcoming Events & Exams</h3>
                        <div class="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                            ${upcomingExams.length > 0 ? upcomingExams.slice(0, 5).map(e => createUpcomingExamCard(e)).join('') : '<p class="text-slate-500 italic">No upcoming events or exams found.</p>'}
                        </div>
                    </div>
                </div>
            </div>`;
        document.getElementById('admin-send-message-btn')?.addEventListener('click', openAdvancedMessageModal);
        if (fees.length > 0 || students.length > 0) {
            renderDashboardCharts(fees, students);
        }
    }
};