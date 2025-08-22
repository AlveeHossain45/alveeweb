// in frontend/src/router.js

import { renderAcademicStructurePage } from './pages/academicStructure.js';
import { renderAccountantDashboard } from './pages/accountantDashboard.js';
import { renderAttendancePage } from './pages/attendance.js';
import { renderContactStudentPage, renderContactTeacherPage } from './pages/contact.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderExamsPage } from './pages/exams.js';
import { renderExpensesPage } from './pages/expenses.js';
import { renderFeesPage } from './pages/fees.js';
import { renderFinancialReports } from './pages/financialReports.js';
import { renderLibraryPage } from './pages/library.js';
import { renderNoticesPage } from './pages/notices.js';
import { renderProfilePage } from './pages/profile.js';
import { renderSalaryPage } from './pages/salaries.js';
import { renderStaffPage } from './pages/staff.js';
import { renderStudentsPage } from './pages/students.js';
import { renderTeachersPage } from './pages/teachers.js';
import { renderTimetablePage } from './pages/timetable.js';
import { renderTransportPage } from './pages/transport.js';
import { currentUser, ui } from './ui.js';
import { navConfig } from './config.js'; // <-- THIS LINE IS THE FIX
import { getSkeletonLoaderHTML } from './utils/helpers.js';


export const navigateTo = (page) => {
    // --- এই নতুন কোডটি বাটনের স্টাইল পরিবর্তন করবে ---
    const activeClasses = [
        'bg-blue-500/30',      // একটি সুন্দর সেমি-ট্রান্সপারেন্ট নীল রঙ
        'border-l-4',          // বাম পাশে একটি বর্ডার যোগ করা হয়েছে
        'border-blue-400',     // বর্ডারের রঙ
        'text-white',          // টেক্সটের রঙ সাদা থাকবে
        'shadow-lg'            // শ্যাডো থাকবে
    ];

    document.querySelectorAll('.sidebar-link').forEach(link => {
        // Remove active styles from all links first
        link.classList.remove(...activeClasses, 'bg-gradient-to-br', 'from-cyan-400', 'via-purple-500', 'to-fuchsia-500', 'shadow-purple-500/40', 'scale-[1.03]'); // পুরনো ক্লাসগুলো মুছে ফেলা হচ্ছে
        link.querySelector('i').classList.remove('text-white');
        link.querySelector('i').classList.add('text-slate-400');
        link.querySelector('span').classList.remove('text-white');

        // Apply active styles to the selected link
        if (link.dataset.page === page) {
            link.classList.add(...activeClasses);
            link.querySelector('i').classList.add('text-white');
            link.querySelector('span').classList.add('text-white');
        }
    });

    // ... ফাংশনের বাকি অংশ অপরিবর্তিত থাকবে
    const pageConfig = navConfig[currentUser.role]?.find(item => item.page === page);
    ui.pageTitle.textContent = pageConfig?.text || 'Page Not Found';

    const pageRenderers = {
        'dashboard': renderDashboard,
        'students': renderStudentsPage,
        'teachers': renderTeachersPage,
        'staff': renderStaffPage,
        'academicStructure': renderAcademicStructurePage,
        'attendance': renderAttendancePage,
        'fees': renderFeesPage,
        'exams': renderExamsPage,
        'notices': renderNoticesPage,
        'profile': renderProfilePage,
        'library': renderLibraryPage,
        'transport': renderTransportPage,
        'contactStudent': renderContactStudentPage,
        'contactTeacher': renderContactTeacherPage,
        'timetable': renderTimetablePage,
        'accountantDashboard': renderAccountantDashboard,
        'salaries': renderSalaryPage,
        'expenses': renderExpensesPage,
        'financialReports': renderFinancialReports,
    };

    const renderFunc = pageRenderers[page];

    const skeletonPages = ['students', 'teachers', 'classes', 'departments', 'fees', 'salaries', 'expenses', 'staff'];
    if (skeletonPages.includes(page)) {
        ui.contentArea.innerHTML = getSkeletonLoaderHTML('table');
    } else if (page && page.toLowerCase().includes('dashboard')) {
        ui.contentArea.innerHTML = getSkeletonLoaderHTML('dashboard');
    } else {
        ui.contentArea.innerHTML = `<div class="flex justify-center items-center h-full"><i class="fas fa-spinner fa-spin fa-3x text-blue-400"></i></div>`;
    }

    if (typeof renderFunc === 'function') {
        setTimeout(renderFunc, 150); 
    } else {
        ui.contentArea.innerHTML = `<div class="animate-fade-in text-center p-8"><h2 class="text-2xl font-bold">Page Not Found</h2><p class="text-slate-400">The page '${page}' is either not implemented or you do not have permission to view it.</p></div>`;
    }
};