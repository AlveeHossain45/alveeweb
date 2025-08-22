// in frontend/src/pages/attendance.js

import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
// --- THIS IS THE FIX: Added getSkeletonLoaderHTML to the import list ---
import { showToast, getSkeletonLoaderHTML } from '../utils/helpers.js';

export async function renderAttendancePage() {
    // --- STUDENT VIEW (Remains Unchanged) ---
    if (currentUser.role === 'Student') {
        const myAttendance = await apiService.getAttendanceReport('student', currentUser.studentId);
        const attendanceByDate = myAttendance.reduce((acc, record) => { const date = new Date(record.date).toISOString().slice(0, 10); acc[date] = record; return acc; }, {});
        ui.contentArea.innerHTML = `<div class="animate-fade-in space-y-6"><h3 class="text-2xl font-bold text-white">My Attendance Record</h3><div id="student-attendance-calendar" class="bg-slate-800/50 p-4 rounded-xl border border-slate-700"></div></div>`;
        const renderCalendar = (year, month) => {
            const calendarEl = document.getElementById('student-attendance-calendar'); const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
            let table = `<div class="flex justify-between items-center mb-4"><button id="prev-month" class="px-3 py-1 bg-slate-700 rounded-lg">&lt;</button><h4 class="text-xl font-semibold">${monthNames[month]} ${year}</h4><button id="next-month" class="px-3 py-1 bg-slate-700 rounded-lg">&gt;</button></div><table class="w-full text-center"><thead><tr>${daysOfWeek.map(d => `<th class="py-2">${d}</th>`).join('')}</tr></thead><tbody>`;
            let date = 1; for (let i = 0; i < 6; i++) { table += '<tr>'; for (let j = 0; j < 7; j++) { if (i === 0 && j < firstDay) { table += '<td></td>'; } else if (date > daysInMonth) { break; } else { const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`; const record = attendanceByDate[fullDate]; let sClass = 'bg-slate-700/50'; if (record) { if (record.status === 'Present') sClass = 'bg-green-500/80 text-white'; else if (record.status === 'Absent') sClass = 'bg-red-500/80 text-white'; else if (record.status === 'Late') sClass = 'bg-yellow-500/80 text-white'; else if (record.status === 'Leave') sClass = 'bg-blue-500/80 text-white'; } table += `<td><div class="w-10 h-10 flex items-center justify-center rounded-full mx-auto ${sClass}">${date}</div></td>`; date++; } } table += '</tr>'; if (date > daysInMonth) break; } table += '</tbody></table>'; calendarEl.innerHTML = table;
            document.getElementById('prev-month').onclick = () => { const newDate = new Date(year, month - 1, 1); renderCalendar(newDate.getFullYear(), newDate.getMonth()); }; document.getElementById('next-month').onclick = () => { const newDate = new Date(year, month + 1, 1); renderCalendar(newDate.getFullYear(), newDate.getMonth()); };
        };
        const today = new Date(); renderCalendar(today.getFullYear(), today.getMonth());
        return;
    }

    // --- ADMIN & TEACHER VIEW (This is the upgraded part) ---
    await Promise.all([store.refresh('sections'), store.refresh('students'), store.refresh('timetable'), store.refresh('departments')]);
    
    let viewableSections = [];
    if (currentUser.role === 'Admin') { viewableSections = store.get('sections'); } 
    else { // Teacher
        const mySectionIds = new Set();
        store.get('sections').forEach(s => { if (s.classTeacherId?.id === currentUser.teacherId) mySectionIds.add(s.id); });
        store.get('timetable').forEach(t => { if (t.teacherId?.id === currentUser.teacherId && t.sectionId?.id) mySectionIds.add(t.sectionId.id); });
        viewableSections = store.get('sections').filter(s => mySectionIds.has(s.id));
    }
    
    // --- MODIFIED: Main Tab Structure is now reordered and restyled ---
    ui.contentArea.innerHTML = `
        <div class="animate-fade-in space-y-6">
            <h3 class="text-2xl font-bold text-white">Attendance</h3>
            <div class="attendance-tabs">
                <button class="attendance-tab active" data-tab="marking">Present & Absent Sheet</button>
                <button class="attendance-tab" data-tab="analytics">Flowchart</button>
            </div>
            
            <div id="marking" class="tab-content"></div>
            <div id="analytics" class="tab-content hidden"></div>
        </div>`;

    // --- RENDERER FOR TAB 1: MARKING ATTENDANCE (Now the default) ---
    const renderMarkingUI = () => {
        const container = document.getElementById('marking');
        if (viewableSections.length === 0) { container.innerHTML = `<p class="text-slate-400">You are not assigned to any sections to mark attendance.</p>`; return; }
        container.innerHTML = `<div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4"><div class="flex flex-wrap items-center gap-4"><input type="date" id="attendance-date" value="${new Date().toISOString().slice(0, 10)}" class="p-2 rounded-lg bg-slate-700 border-slate-600 focus:ring-2 focus:ring-blue-500"><select id="attendance-section" class="p-2 rounded-lg bg-slate-700 border-slate-600 focus:ring-2 focus:ring-blue-500 flex-grow"><option value="">-- Select a Section --</option>${viewableSections.map(s => `<option value="${s.id}">${s.subjectId?.departmentId?.name} - ${s.subjectId?.name} (Sec ${s.name})</option>`).join('')}</select><button id="load-attendance-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Load</button></div><div id="attendance-sheet"><p class="text-center text-slate-400 pt-4">Please select a date and section.</p></div></div>`;
        document.getElementById('load-attendance-btn').onclick = async () => {
            const date = document.getElementById('attendance-date').value; const sectionId = document.getElementById('attendance-section').value; const sheetContainer = document.getElementById('attendance-sheet');
            if (!date || !sectionId) { sheetContainer.innerHTML = `<p class="text-red-400 text-center">Please select both date and section.</p>`; return; }
            sheetContainer.innerHTML = getSkeletonLoaderHTML('table');
            const students = store.get('students').filter(s => s.sectionId?.id === sectionId); const attendanceMap = await apiService.getAttendance(sectionId, date);
            let present = 0, 
            absent = 0, 
            late = 0, 
            leave = 0; 
            students.forEach(s => { const status = attendanceMap[s.id] || 'Present'; 
                if (status === 'Present') present++; 
                else if (status === 'Absent') absent++; 
                else if (status === 'Late') late++; 
                else if (status === 'Leave') leave++; });
            sheetContainer.innerHTML = `<div class="attendance-summary"><div class="summary-item"><i class="fas fa-check-circle icon text-green-400"></i><div><p class="count">${present}</p><p class="label">Present</p></div></div><div class="summary-item"><i class="fas fa-times-circle icon text-red-400"></i><div><p class="count">${absent}</p><p class="label">Absent</p></div></div><div class="summary-item"><i class="fas fa-clock icon text-yellow-400"></i><div><p class="count">${late}</p><p class="label">Late</p></div></div><div class="summary-item"><i class="fas fa-envelope-open-text icon text-blue-400"></i><div><p class="count">${leave}</p><p class="label">Leave</p></div></div></div><div class="overflow-x-auto mt-4"><table class="min-w-full"><thead class="bg-slate-700"><tr><th class="py-3 px-4 text-left">Student Name</th><th class="py-3 px-4 text-left">Roll No</th><th class="py-3 px-4 text-left">Status</th></tr></thead><tbody class="divide-y divide-slate-700">${students.map(s => { const currentStatus = attendanceMap[s.id] || 'Present'; return `<tr data-studentid="${s.id}"><td class="px-4 py-3">${s.name}</td><td class="px-4 py-3">${s.rollNo}</td><td class="px-4 py-3"><div class="attendance-status-pills"><div class="status-pill pill-present ${currentStatus === 'Present' ? 'selected' : ''}" data-status="Present" title="Present">P</div><div class="status-pill pill-absent ${currentStatus === 'Absent' ? 'selected' : ''}" data-status="Absent" title="Absent">A</div><div class="status-pill pill-late ${currentStatus === 'Late' ? 'selected' : ''}" data-status="Late" title="Late">L</div><div class="status-pill pill-leave ${currentStatus === 'Leave' ? 'selected' : ''}" data-status="Leave" title="Leave">E</div></div></td></tr>` }).join('')}</tbody></table><button id="save-attendance-btn" class="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">Save Attendance</button></div>`;
            const sheetTable = sheetContainer.querySelector('tbody');
            sheetTable.addEventListener('click', (e) => { if (e.target.classList.contains('status-pill')) { const pill = e.target; const row = pill.closest('tr'); row.querySelectorAll('.status-pill').forEach(p => p.classList.remove('selected')); pill.classList.add('selected'); } });
            document.getElementById('save-attendance-btn').onclick = async () => {
                const records = {}; sheetTable.querySelectorAll('tr').forEach(row => { const studentId = row.dataset.studentid; const selectedPill = row.querySelector('.status-pill.selected'); if (studentId && selectedPill) { records[studentId] = selectedPill.dataset.status; } });
                const payload = { date, sectionId, records, markedBy: currentUser.id }; const result = await apiService.saveAttendance(payload);
                if (result.success) { showToast('Attendance saved successfully!', 'success'); document.getElementById('load-attendance-btn').click(); }
            };
        };
    };
    
    // --- RENDERER FOR TAB 2: ANALYTICS DASHBOARD (Now secondary) ---
    const renderAnalyticsDashboard = () => {
        const container = document.getElementById('analytics');
        if (viewableSections.length === 0) { container.innerHTML = `<p class="text-slate-400">You are not assigned to any sections to view analytics.</p>`; return; }
        container.innerHTML = `<div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 space-y-4"><div class="flex flex-wrap items-center gap-4"><select id="analytics-section" class="p-2 rounded-lg bg-slate-700 border-slate-600 flex-grow">${viewableSections.map(s => `<option value="${s.id}">${s.subjectId?.departmentId?.name} - ${s.subjectId?.name} (Sec ${s.name})</option>`).join('')}</select><input type="date" id="analytics-start-date" class="p-2 rounded-lg bg-slate-700 border-slate-600"><input type="date" id="analytics-end-date" class="p-2 rounded-lg bg-slate-700 border-slate-600" value="${new Date().toISOString().slice(0, 10)}"><button id="generate-analytics-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">Generate</button></div><div id="analytics-results" class="pt-4"><p class="text-center text-slate-400">Select a section and date range to view analytics.</p></div></div>`;
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); document.getElementById('analytics-start-date').value = thirtyDaysAgo.toISOString().slice(0, 10);
        document.getElementById('generate-analytics-btn').onclick = async () => {
            const sectionId = document.getElementById('analytics-section').value; const startDate = document.getElementById('analytics-start-date').value; const endDate = document.getElementById('analytics-end-date').value; const resultsContainer = document.getElementById('analytics-results');
            if (!sectionId || !startDate || !endDate) { resultsContainer.innerHTML = `<p class="text-red-400 text-center">Please select a section and a date range.</p>`; return; }
            const reportData = await apiService.getAttendanceReport('section', sectionId, { startDate, endDate });
            if (reportData.length === 0) { resultsContainer.innerHTML = `<p class="text-slate-400 text-center pt-8">No attendance records found for this period.</p>`; return; }
            const studentsInSection = store.get('students').filter(s => s.sectionId?.id === sectionId); const studentStats = new Map(studentsInSection.map(s => [s.id, { name: s.name, rollNo: s.rollNo, present: 0, absent: 0, late: 0, leave: 0, total: 0 }]));
            let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0;
            reportData.forEach(record => { const stat = studentStats.get(record.studentId._id); if (stat) { stat[record.status.toLowerCase()]++; stat.total++; } });
            studentStats.forEach(stat => { totalPresent += stat.present; totalAbsent += stat.absent; totalLate += stat.late; totalLeave += stat.leave; });
            const totalRecords = totalPresent + totalAbsent + totalLate + totalLeave; const overallAttendance = totalRecords > 0 ? ((totalPresent + totalLate) / totalRecords * 100).toFixed(1) : 0;
            resultsContainer.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><div class="stat-card-attendance"><div class="stat-icon bg-green-500/20 text-green-400"><i class="fas fa-check"></i></div><div><p class="stat-value">${overallAttendance}%</p><p class="stat-label">Overall Attendance</p></div></div><div class="stat-card-attendance"><div class="stat-icon bg-red-500/20 text-red-400"><i class="fas fa-times"></i></div><div><p class="stat-value">${totalAbsent}</p><p class="stat-label">Total Absences</p></div></div><div class="stat-card-attendance"><div class="stat-icon bg-yellow-500/20 text-yellow-400"><i class="fas fa-clock"></i></div><div><p class="stat-value">${totalLate}</p><p class="stat-label">Total Lates</p></div></div><div class="stat-card-attendance"><div class="stat-icon bg-blue-500/20 text-blue-400"><i class="fas fa-envelope"></i></div><div><p class="stat-value">${totalLeave}</p><p class="stat-label">Total Leaves</p></div></div></div><div class="grid grid-cols-1 lg:grid-cols-3 gap-6"><div class="lg:col-span-1 chart-container"><canvas id="attendance-pie-chart"></canvas></div><div class="lg:col-span-2 bg-slate-900/50 p-4 rounded-xl border border-slate-700"><h4 class="font-semibold mb-2">Student Breakdown</h4><div class="overflow-y-auto custom-scrollbar" style="max-height: 260px;"><table class="min-w-full text-sm"><thead class="sticky top-0 bg-slate-900/80 backdrop-blur-sm"><tr><th class="p-2 text-left">Student</th><th class="p-2 text-left w-40">Attendance %</th><th class="p-2 text-center">P</th><th class="p-2 text-center">A</th><th class="p-2 text-center">L</th><th class="p-2 text-center">E</th></tr></thead><tbody>${Array.from(studentStats.values()).map(s => { const studentAttendance = s.total > 0 ? ((s.present + s.late) / s.total * 100) : 0; return `<tr class="border-t border-slate-800"><td class="p-2">${s.name}</td><td><div class="flex items-center gap-2"><div class="progress-bar-container"><div class="progress-bar bg-green-500" style="width: ${studentAttendance}%"></div></div><span class="font-semibold">${studentAttendance.toFixed(0)}%</span></div></td><td class="text-center text-green-400">${s.present}</td><td class="text-center text-red-400">${s.absent}</td><td class="text-center text-yellow-400">${s.late}</td><td class="text-center text-blue-400">${s.leave}</td></tr>` }).join('')}</tbody></table></div></div></div>`;
            const pieCtx = document.getElementById('attendance-pie-chart').getContext('2d'); new Chart(pieCtx, { type: 'doughnut', data: { labels: ['Present', 'Absent', 'Late', 'Leave'], datasets: [{ data: [totalPresent, totalAbsent, totalLate, totalLeave], backgroundColor: ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'], borderColor: '#1e293b', borderWidth: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#e2e8f0', boxWidth: 12 } } } } });
        };
    };

    // --- Initial render and tab setup ---
    renderMarkingUI(); // Render the marking UI first
    renderAnalyticsDashboard(); // Then render the analytics UI (which will be hidden by default)
    
    document.querySelectorAll('.attendance-tab').forEach(button => button.onclick = (e) => {
        document.querySelectorAll('.attendance-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        e.currentTarget.classList.add('active');
        document.getElementById(e.currentTarget.dataset.tab).classList.remove('hidden');
    });
}