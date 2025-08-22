// in frontend/src/pages/timetable.js

import { navigateTo } from '../router.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';

export async function renderTimetablePage() {
    // 1. Fetch all necessary data first
    await Promise.all([
        store.refresh('timetable'),
        store.refresh('departments'),
        store.refresh('subjects'),
        store.refresh('teachers'),
        store.refresh('sections')
    ]);

    const allTimetable = store.get('timetable');
    const departments = store.get('departments');
    const role = currentUser.role;

    // Premium time formatting with emoji support
    const formatTime = (timeStr) => {
        if (!timeStr) return '🕒 N/A';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHours = h % 12 || 12;
        const timeEmoji = h < 12 ? '🌅' : h < 17 ? '🌞' : '🌙';
        return `${timeEmoji} ${formattedHours}:${minutes} ${ampm}`;
    };

    // --- PREMIUM ADMIN VIEW ---
    if (role === 'Admin' || role === 'Accountant' || role === 'Librarian') {
        let selectedDeptId = departments.length > 0 ? departments[0].id : null;

        const renderAdminView = () => {
            const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            const dayEmojis = ["📅", "🌱", "🚀", "🎯", "✨", "🎉", "🌙"];
            
            const relevantTimetableEntries = allTimetable.filter(entry => 
                entry.sectionId?.subjectId?.departmentId?.id === selectedDeptId
            );
            
            const entriesBySection = relevantTimetableEntries.reduce((acc, entry) => {
                const sectionName = `${entry.subjectId?.name || '❓ Unknown'} - Section ${entry.sectionId?.name || 'N/A'}`;
                if (!acc[sectionName]) acc[sectionName] = [];
                acc[sectionName].push(entry);
                return acc;
            }, {});

            const getTimetableHTMLForSection = (sectionName, schedule) => {
                const timeSlots = [...new Set(schedule.map(t => t.startTime))].sort((a,b) => a.localeCompare(b));
                if (timeSlots.length === 0) return '';

                return `
                    <div class="bg-gradient-to-br from-slate-900/80 to-slate-800/90 p-6 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm">
                        <div class="flex items-center mb-6">
                            <div class="bg-blue-500/20 p-3 rounded-xl mr-4">
                                <i class="fas fa-calendar-alt text-2xl text-blue-400"></i>
                            </div>
                            <h3 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">${sectionName}</h3>
                        </div>
                        
                        <div class="overflow-x-auto custom-scrollbar">
                            <table class="min-w-full border-collapse">
                                <thead>
                                    <tr class="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl">
                                        <th class="p-4 border border-slate-600/50 rounded-tl-xl">Time/Day</th>
                                        ${days.map((day, i) => `
                                            <th class="p-4 border border-slate-600/50 ${i === days.length - 1 ? 'rounded-tr-xl' : ''}">
                                                <div class="flex items-center justify-center gap-2">
                                                    <span>${dayEmojis[i]}</span>
                                                    <span>${day}</span>
                                                </div>
                                            </th>
                                        `).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${timeSlots.map((startTime, i) => `
                                        <tr class="${i === timeSlots.length - 1 ? 'rounded-b-xl' : ''}">
                                            <td class="p-4 border border-slate-600/50 font-medium bg-slate-800/30 ${i === timeSlots.length - 1 ? 'rounded-bl-xl' : ''}">
                                                <div class="flex flex-col items-center">
                                                    <p class="font-bold text-white">${formatTime(startTime)}</p>
                                                    <p class="text-xs text-slate-400 mt-1">${schedule.find(e => e.startTime === startTime)?.endTime ? formatTime(schedule.find(e => e.startTime === startTime).endTime) : ''}</p>
                                                </div>
                                            </td>
                                            ${days.map((day, j) => {
                                                const entry = schedule.find(item => item.dayOfWeek === day && item.startTime === startTime);
                                                return `
                                                    <td class="p-4 border border-slate-600/50 align-middle ${i === timeSlots.length - 1 && j === days.length - 1 ? 'rounded-br-xl' : ''}">
                                                        ${entry ? `
                                                            <div class="bg-blue-900/20 p-3 rounded-lg border border-blue-800/30 hover:bg-blue-800/30 transition-all duration-200">
                                                                <p class="font-bold text-white flex items-center gap-2">
                                                                    <i class="fas fa-book text-blue-300"></i>
                                                                    ${entry.subjectId?.name || 'N/A'}
                                                                </p>
                                                                <p class="text-sm text-slate-300 mt-1 flex items-center gap-2">
                                                                    <i class="fas fa-chalkboard-teacher text-amber-400/80"></i>
                                                                    ${entry.teacherId?.name || 'N/A'}
                                                                </p>
                                                            </div>
                                                        ` : '<div class="h-full w-full bg-slate-800/10 rounded-lg"></div>'}
                                                    </td>
                                                `;
                                            }).join('')}
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>`;
            };

            ui.contentArea.innerHTML = `
                <div class="space-y-8 animate-fade-in">
                    <div class="flex flex-wrap justify-between items-center gap-6 p-6 bg-gradient-to-r from-slate-800/70 to-slate-900/70 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm">
                        <div class="flex items-center gap-4">
                            <div class="bg-indigo-500/20 p-3 rounded-xl">
                                <i class="fas fa-filter text-indigo-400"></i>
                            </div>
                            <div>
                                <label for="dept-filter" class="block text-sm text-slate-300 mb-1">View Timetable for:</label>
                                <select id="dept-filter" class="p-2 pl-3 pr-8 rounded-xl bg-slate-800 border border-slate-600 focus:ring-2 focus:ring-blue-500 appearance-none bg-arrow-down bg-no-repeat bg-[center_right_0.75rem]">
                                    ${departments.map(d => `
                                        <option value="${d.id}" ${d.id === selectedDeptId ? 'selected' : ''}>
                                            ${d.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="text-slate-300 text-sm bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                            <i class="fas fa-info-circle mr-2 text-blue-400"></i>
                            Manage timetable in <a href="#" data-page="academicStructure" class="text-blue-400 hover:underline font-medium">Academic Structure</a>
                        </div>
                    </div>

                    <div id="timetable-grids" class="space-y-8">
                        ${Object.keys(entriesBySection).length > 0 ? 
                            Object.entries(entriesBySection).map(([sectionName, schedule]) => 
                                getTimetableHTMLForSection(sectionName, schedule)
                            ).join('') : 
                            `<div class="bg-slate-900/50 p-12 rounded-2xl shadow-xl text-center border-2 border-dashed border-slate-700/50">
                                <div class="inline-block bg-slate-800/50 p-6 rounded-full mb-4">
                                    <i class="fas fa-calendar-times text-4xl text-slate-500/70"></i>
                                </div>
                                <h3 class="text-2xl font-bold text-white mb-2">No Timetable Found</h3>
                                <p class="text-slate-400 max-w-md mx-auto">
                                    There are no scheduled classes for the selected department. Start by adding courses in the Academic Structure.
                                </p>
                            </div>`
                        }
                    </div>
                </div>
            `;
            
            // --- THIS IS THE FIX: Attach event listeners programmatically ---
            document.querySelector('a[data-page="academicStructure"]')?.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo('academicStructure');
            });
            
            document.getElementById('dept-filter')?.addEventListener('change', (e) => {
                selectedDeptId = e.target.value;
                renderAdminView();
            });
        };
        renderAdminView();
    } 
    // --- PREMIUM PERSONAL VIEW FOR TEACHER/STUDENT ---
    else {
        let personalSchedule = [];

        if (role === 'Teacher') {
            personalSchedule = allTimetable.filter(entry => entry.teacherId?.id === currentUser.teacherId);
        } else if (role === 'Student') {
            personalSchedule = allTimetable.filter(entry => entry.sectionId?.id === currentUser.sectionId);
        }

        const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        const dayEmojis = ["📅", "🌱", "🚀", "🎯", "✨", "🎉", "🌙"];
        
        // Group entries by day and sort them by time
        const scheduleByDay = daysOfWeek.reduce((acc, day) => {
            const dayEntries = personalSchedule
                .filter(entry => entry.dayOfWeek === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (dayEntries.length > 0) {
                acc[day] = dayEntries;
            }
            return acc;
        }, {});
        
        const renderPersonalView = () => {
            ui.contentArea.innerHTML = `
                <div class="space-y-6 animate-fade-in">
                    ${Object.keys(scheduleByDay).length > 0 ? 
                        Object.entries(scheduleByDay).map(([day, entries], i) => `
                            <div class="bg-gradient-to-br from-slate-900/80 to-slate-800/90 p-6 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm transform transition-all duration-300 hover:border-blue-500/30 hover:shadow-blue-500/10">
                                <div class="flex items-center mb-6">
                                    <div class="bg-gradient-to-r from-blue-500/30 to-cyan-500/20 p-3 rounded-xl mr-4">
                                        <span class="text-2xl">${dayEmojis[i]}</span>
                                    </div>
                                    <h3 class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">${day}</h3>
                                </div>
                                
                                <div class="grid gap-4">
                                    ${entries.map(entry => `
                                        <div class="flex items-stretch gap-4 bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-5 rounded-xl border border-slate-700/50 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-blue-500/30">
                                            <div class="flex flex-col items-center justify-center bg-slate-800/70 text-white rounded-lg px-5 py-3 min-w-[140px] border border-slate-700/50">
                                                <p class="text-lg font-bold">${formatTime(entry.startTime)}</p>
                                                <div class="w-8 h-px bg-slate-600 my-1"></div>
                                                <p class="text-lg font-bold">${formatTime(entry.endTime)}</p>
                                            </div>
                                            
                                            <div class="flex-grow flex flex-col justify-center">
                                                <p class="font-bold text-white text-xl flex items-center gap-3">
                                                    <i class="fas fa-book text-blue-400/80"></i>
                                                    ${entry.subjectId?.name || 'N/A'}
                                                </p>
                                                ${role === 'Teacher' ? `
                                                    <p class="text-sm text-slate-300 mt-2 flex items-center gap-3">
                                                        <i class="fas fa-users text-amber-400/80"></i>
                                                        Section: ${entry.sectionId?.name || 'N/A'} • ${entry.sectionId?.subjectId?.departmentId?.name || 'N/A'}
                                                    </p>
                                                ` : ''}
                                                ${role === 'Student' ? `
                                                    <p class="text-sm text-slate-300 mt-2 flex items-center gap-3">
                                                        <i class="fas fa-chalkboard-teacher text-purple-400/80"></i>
                                                        ${entry.teacherId?.name || 'N/A'}
                                                    </p>
                                                ` : ''}
                                            </div>
                                            
                                            <div class="flex items-center justify-center text-blue-400/50 text-3xl opacity-80 hover:opacity-100 transition-opacity">
                                                <i class="fas fa-ellipsis-vertical"></i>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('') :
                        `<div class="bg-gradient-to-br from-slate-900/70 to-slate-800/80 p-12 rounded-2xl shadow-2xl text-center border-2 border-dashed border-slate-700/50 backdrop-blur-sm">
                            <div class="inline-block bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 rounded-full mb-6 border border-slate-700/50">
                                <i class="fas fa-calendar-check text-5xl text-blue-400/30"></i>
                            </div>
                            <h3 class="text-3xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                                ${role === 'Teacher' ? 'Your Schedule Is Clear!' : 'No Classes Scheduled!'}
                            </h3>
                            <p class="text-slate-400 max-w-md mx-auto">
                                ${role === 'Teacher' ? 
                                    'Enjoy your free time! Contact admin if you need teaching assignments.' : 
                                    'Check back later for your class schedule or contact your department.'}
                            </p>
                        </div>`
                    }
                </div>
            `;
        };
        renderPersonalView();
    }
}