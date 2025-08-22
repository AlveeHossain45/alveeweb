import { navigateTo } from './router.js';
import { navConfig } from './config.js'; 
import { generateInitialsAvatar } from './utils/helpers.js';
export let currentUser = null;


export function setCurrentUser(user) {
    currentUser = user;
}


export const ui = {
    loginPage: document.getElementById('login-page'),
    app: document.getElementById('app'),                
    loginForm: document.getElementById('login-form'),
    loginMessage: document.getElementById('login-message'),
    logoutButton: document.getElementById('logout-button'),
    contentArea: document.getElementById('content-area'),
    pageTitle: document.getElementById('page-title'),
    navMenu: document.getElementById('nav-menu'),
    userInfo: document.getElementById('user-info'),
    userNameDisplay: document.getElementById('user-name-display'),
    userRoleDisplay: document.getElementById('user-role-display'),
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    modal: document.getElementById('form-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    closeModalButton: document.getElementById('close-modal-button'),
    confirmModal: document.getElementById('confirm-modal'),
    confirmText: document.getElementById('confirm-text'),
    confirmYesBtn: document.getElementById('confirm-yes-btn'),
    confirmNoBtn: document.getElementById('confirm-no-btn'),
    headerUserAvatar: document.getElementById('header-user-avatar'),
    toastContainer: document.getElementById('toast-container'),
    resetDataBtn: document.getElementById('reset-data-btn'), 
};

export const toggleSidebar = () => {
    ui.sidebar.classList.toggle('sidebar-open');
    ui.sidebarOverlay.classList.toggle('hidden');
};

export function updateSidebarNotifications() {
    const notifications = JSON.parse(sessionStorage.getItem('sms_chat_notifications')) || {};
    const hasNotification = notifications[currentUser.id];

    // Determine which sidebar link to target
    const linkSelector = currentUser.role === 'Student' 
        ? '[data-page="contactTeacher"]' 
        : '[data-page="contactStudent"]';
    
    const sidebarLink = document.querySelector(`.sidebar-link${linkSelector}`);
    if (!sidebarLink) return;

    // Remove any existing dot first to prevent duplicates
    const existingDot = sidebarLink.querySelector('.notification-dot');
    if (existingDot) existingDot.remove();

    // Add a new dot if there's a notification
    if (hasNotification) {
        const dot = document.createElement('span');
        dot.className = 'notification-dot';
        sidebarLink.appendChild(dot);
    }
}

export const setupUIForRole = () => {
    if (!currentUser) return;

    // Update header with user info
    ui.headerUserAvatar.src = currentUser.profileImage || generateInitialsAvatar(currentUser.name);
    ui.userNameDisplay.textContent = currentUser.name || currentUser.username;
    ui.userRoleDisplay.textContent = currentUser.role;

    // Build the navigation menu from the config with the premium styling
    const menuItems = navConfig[currentUser.role] || [];
    ui.navMenu.innerHTML = menuItems.map(item => `
        <a href="#" 
           class="sidebar-link group relative flex items-center gap-4 rounded-xl p-3 my-1 text-slate-300 
                  transition-all duration-300 ease-in-out
                  transform hover:scale-[1.03] hover:shadow-lg hover:shadow-purple-500/40
                  hover:bg-gradient-to-br from-cyan-400 via-purple-500 to-fuchsia-500"
           data-page="${item.page}">
            
            <i class="fas ${item.icon} w-6 text-center text-lg text-slate-400 
                       group-hover:text-white transition-colors duration-300"></i>
            
            <span class="font-medium group-hover:text-white transition-colors duration-300">
                ${item.text}
            </span>
        </a>
    `).join('');

    // Add click listeners to the nav links
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
            if (window.innerWidth < 1024) { 
                toggleSidebar();
            }
        });
    });

    // --- NEW CUSTOM-STYLED LOGOUT AND RESET BUTTONS ---

    // Style the Logout Button with user-specified red color
    const logoutButton = ui.logoutButton;
    logoutButton.className = "group flex items-center justify-start gap-3 rounded-lg px-4 py-2 text-white bg-[#e74c3c] transition-all duration-300 transform hover:bg-[#c0392b] hover:scale-105 hover:shadow-lg shadow-[#e74c3c]/50";
    logoutButton.innerHTML = `
        <i class="fas fa-sign-out-alt"></i>
        <span class="font-semibold">Logout</span>
    `;

    // Style the Reset All Data Button with user-specified orange color
    const resetDataBtn = ui.resetDataBtn;
    resetDataBtn.className = "group flex items-center justify-start gap-3 mt-2 rounded-lg px-4 py-2 text-white bg-[#ff9f43] transition-all duration-300 transform hover:bg-[#d67400] hover:scale-105 hover:shadow-lg shadow-[#ff9f43]/50";
    resetDataBtn.innerHTML = `
        <i class="fas fa-sync-alt transition-transform duration-500 group-hover:rotate-180"></i>
        <span class="font-semibold">Reset All Data</span>
    `;
};