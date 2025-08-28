// src/config.js
export const navConfig = {
    Admin: [
        { icon: 'fa-tachometer-alt', text: 'Dashboard', page: 'dashboard' },
        { icon: 'fa-user-graduate', text: 'Students', page: 'students' },
        { icon: 'fa-chalkboard-teacher', text: 'Teachers', page: 'teachers' },
        { icon: 'fa-users-cog', text: 'Staff Management', page: 'staff' },
        { icon: 'fa-sitemap', text: 'Academic Structure', page: 'academicStructure' },
        { icon: 'fa-calendar-alt', text: 'Timetable', page: 'timetable' },
        { icon: 'fa-file-export', text: 'Financial Reports', page: 'financialReports' },
        { icon: 'fa-bullhorn', text: 'Notice Board', page: 'notices' },
        { icon: 'fa-book-open-reader', text: 'Library', page: 'library' },
        { icon: 'fa-bus', text: 'Transport', page: 'transport' },
        { icon: 'fa-user-circle', text: 'Profile', page: 'profile' },
    ],
    Teacher: [
        { icon: 'fa-tachometer-alt', text: 'Dashboard', page: 'dashboard' },
        { icon: 'fa-user-graduate', text: 'My Students', page: 'students' },
        { icon: 'fa-calendar-check', text: 'Attendance', page: 'attendance' },
        { icon: 'fa-calendar-alt', text: 'My Timetable', page: 'timetable' },
        { icon: 'fa-file-alt', text: 'Exams & Results', page: 'exams' },
        { icon: 'fa-bullhorn', text: 'Notice Board', page: 'notices' },
        { icon: 'fa-user-circle', text: 'Profile', page: 'profile' },
    ],
    Student: [
        { icon: 'fa-tachometer-alt', text: 'Dashboard', page: 'dashboard' },
        { icon: 'fa-calendar-alt', text: 'My Timetable', page: 'timetable' },
        { icon: 'fa-file-invoice-dollar', text: 'My Fees', page: 'fees' },
        { icon: 'fa-calendar-check', text: 'Exams & Results', page: 'exams' },
        { icon: 'fa-bullhorn', text: 'Notice Board', page: 'notices' },
        { icon: 'fa-book-open', text: 'Library', page: 'library' },
        { icon: 'fa-user-circle', text: 'My Profile', page: 'profile' }
    ],
    Accountant: [
        { icon: 'fa-chart-pie', text: 'Dashboard', page: 'accountantDashboard' },
        { icon: 'fa-file-invoice-dollar', text: 'Fee Collection', page: 'fees' },
        { icon: 'fa-money-check-alt', text: 'Salary Management', page: 'salaries' },
        { icon: 'fa-receipt', text: 'Expense Tracking', page: 'expenses' },
        { icon: 'fa-file-export', text: 'Financial Reports', page: 'financialReports' },
        { icon: 'fa-user-circle', text: 'Profile', page: 'profile' },
    ],
    Librarian: [
        { icon: 'fa-book-open-reader', text: 'Library Management', page: 'library' },
        { icon: 'fa-user-circle', text: 'Profile', page: 'profile' },
    ],
};