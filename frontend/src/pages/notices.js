import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { generateInitialsAvatar, showConfirmationModal, showToast, timeAgo, openAdvancedMessageModal } from '../utils/helpers.js';
export async function renderNoticesPage() {
    // ডেটাবেস থেকে সর্বশেষ তথ্য আনা হচ্ছে
    await store.refresh('notices');
    await store.refresh('users');
    await store.refresh('sections'); // সেকশনের নাম পাওয়ার জন্য এটি প্রয়োজন
    await store.refresh('timetable'); // শিক্ষকের সেকশন খুঁজে বের করার জন্য এটি প্রয়োজন

    const allNotices = store.get('notices');
    const allUsersMap = new Map(store.get('users').map(u => [u.id, u]));
    allUsersMap.set(currentUser.id, currentUser); // নিজের তথ্যও ম্যাপে যোগ করা

    ui.contentArea.innerHTML = `
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700/70 shadow-2xl animate-fade-in">
            <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <h3 class="text-2xl font-bold text-white">Notice Board</h3>
                ${(currentUser.role === 'Admin' || currentUser.role === 'Teacher') ?
                    `<button id="add-new-notice-btn" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]">
                        <i class="fas fa-plus"></i> Create New Notice
                     </button>`
                    : ''}
            </div>
            <div id="notice-list-container" class="space-y-6">
                <!-- Notices will be rendered here -->
            </div>
        </div>`;

    const noticeListContainer = document.getElementById('notice-list-container');

    const renderList = () => {
        const relevantNotices = allNotices.filter(n => {
            // নিয়ম ১: ব্যবহারকারী নিজের লেখা সব মেসেজ দেখতে পাবে।
            if (n.authorId === currentUser.id) {
                return true;
            }
            // নিয়ম ২: ব্যবহারকারীকে পাঠানো ব্যক্তিগত মেসেজ (private_message) সে দেখতে পাবে।
            if (n.type === 'private_message' && n.target === currentUser.id) {
                return true;
            }
            // নিয়ম ৩: পাবলিক নোটিশ (notice) হলে, রোল অনুযায়ী ফিল্টার করা হবে।
            if (n.type === 'notice') {
                switch (currentUser.role) {
                    case 'Admin':
                        // --- সমাধান: অ্যাডমিন এখন থেকে আর সেকশন-ভিত্তিক নোটিশ দেখবে না ---
                        // শুধুমাত্র ব্রডকাস্ট নোটিশগুলো দেখানো হবে।
                        return ['All', 'Staff', 'Teacher', 'Student'].includes(n.target);
                    
                    case 'Teacher':
                        const mySectionIds = new Set();
                        store.get('sections').forEach(section => {
                            if (section.classTeacherId?.id === currentUser.teacherId) {
                                mySectionIds.add(section.id);
                            }
                        });
                        store.get('timetable').forEach(entry => {
                            if (entry.teacherId?.id === currentUser.teacherId && entry.sectionId?.id) {
                                mySectionIds.add(entry.sectionId.id);
                            }
                        });
                        if (['All', 'Staff', 'Teacher'].includes(n.target)) return true;
                        if (n.target.startsWith('section_')) {
                            const sectionId = n.target.replace('section_', '');
                            return mySectionIds.has(sectionId);
                        }
                        return false;

                    case 'Student':
                        return ['All', 'Student', `section_${currentUser.sectionId}`].includes(n.target);
                    
                    case 'Accountant':
                    case 'Librarian':
                        return ['All', 'Staff'].includes(n.target);
                }
            }
            return false;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));


        if (relevantNotices.length === 0) {
            noticeListContainer.innerHTML = `<div class="text-center py-16 text-slate-400"><p>No relevant notices or messages found.</p></div>`;
            return;
        }

        noticeListContainer.innerHTML = relevantNotices.map(notice => {
            const author = allUsersMap.get(notice.authorId) || { name: 'School Admin', profileImage: null };
            return createPremiumNoticeCard(notice, author);
        }).join('');

        attachNoticeActionListeners();
    };

    const addNewNoticeBtn = document.getElementById('add-new-notice-btn');
    if (addNewNoticeBtn) {
        addNewNoticeBtn.onclick = () => openAdvancedMessageModal();
    }

    renderList();
}

export function createPremiumNoticeCard(notice, author) {
    const allUsersMap = new Map(store.get('users').map(u => [u.id, u]));
    const isPrivate = notice.type === 'private_message';
    
    // Determine card styling based on notice type
    let cardClasses, iconClasses, badgeClasses, ribbonContent;
    
    if (isPrivate) {
        const recipient = allUsersMap.get(notice.target);
        cardClasses = "border-l-4 border-purple-500 bg-gradient-to-br from-slate-800/70 to-slate-900/80";
        iconClasses = "fas fa-user-secret text-purple-400";
        badgeClasses = "bg-purple-500/20 text-purple-400";
        ribbonContent = `Private to ${recipient?.name || 'user'}`;
    } else {
        switch (notice.target) {
            case 'All':
                cardClasses = "border-l-4 border-blue-500 bg-gradient-to-br from-slate-800/70 to-slate-900/80";
                iconClasses = "fas fa-bullhorn text-blue-400";
                badgeClasses = "bg-blue-500/20 text-blue-400";
                ribbonContent = "Public Notice";
                break;
            case 'Student':
                cardClasses = "border-l-4 border-green-500 bg-gradient-to-br from-slate-800/70 to-slate-900/80";
                iconClasses = "fas fa-user-graduate text-green-400";
                badgeClasses = "bg-green-500/20 text-green-400";
                ribbonContent = "For Students";
                break;
            case 'Teacher':
                cardClasses = "border-l-4 border-amber-500 bg-gradient-to-br from-slate-800/70 to-slate-900/80";
                iconClasses = "fas fa-chalkboard-teacher text-amber-400";
                badgeClasses = "bg-amber-500/20 text-amber-400";
                ribbonContent = "For Teachers";
                break;
            default:
                const className = store.getMap('classes').get(notice.target.replace('class_', ''))?.name;
                cardClasses = "border-l-4 border-rose-500 bg-gradient-to-br from-slate-800/70 to-slate-900/80";
                iconClasses = "fas fa-users text-rose-400";
                badgeClasses = "bg-rose-500/20 text-rose-400";
                ribbonContent = className ? `For ${className}` : "Class Notice";
                break;
        }
    }

    // Action buttons
    let actionButtons = '';
    if (currentUser.role === 'Admin' || notice.authorId === currentUser.id) {
        actionButtons = `
            <button class="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-all delete-btn" 
                    title="Delete" data-id="${notice.id}">
                <i class="fas fa-trash-alt"></i>
            </button>`;
    }

    const authorAvatar = author.profileImage || generateInitialsAvatar(author.name);
    const formattedDate = new Date(notice.date).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

    return `
    <div class="${cardClasses} rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] group">
        <!-- Ribbon for notice type -->
        <div class="absolute top-0 right-0 px-3 py-1 text-xs font-semibold ${badgeClasses} rounded-bl-lg">
            ${ribbonContent}
        </div>
        
        <div class="p-5">
            <div class="flex items-start gap-4">
                <!-- Icon -->
                <div class="flex-shrink-0 mt-1">
                    <div class="w-10 h-10 rounded-lg ${badgeClasses.replace('text', 'bg')} flex items-center justify-center">
                        <i class="${iconClasses}"></i>
                    </div>
                </div>
                
                <!-- Content -->
                <div class="flex-grow">
                    <div class="flex justify-between items-start gap-2">
                        <div>
                            <h4 class="text-xl font-bold text-white">${notice.title}</h4>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs text-slate-400">${formattedDate}</span>
                            </div>
                        </div>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${actionButtons}
                        </div>
                    </div>

                    <div class="mt-4 pl-1">
                        <p class="text-slate-300 whitespace-pre-wrap">${notice.content}</p>
                    </div>

                    <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-700/50">
                        <div class="flex items-center gap-3">
                            <img src="${authorAvatar}" alt="${author.name}" class="w-8 h-8 rounded-full object-cover border-2 border-slate-700">
                            <div>
                                <p class="text-sm font-medium text-slate-300">${author.name}</p>
                                <p class="text-xs text-slate-500">${author.role || 'Staff'}</p>
                            </div>
                        </div>
                        
                        <div class="text-xs text-slate-500">
                            <i class="far fa-clock mr-1"></i> ${timeAgo(notice.date)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

export function attachNoticeActionListeners() {
    // Listener for all delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
            showConfirmationModal('Are you sure you want to delete this notice/message?', async () => {
                await apiService.remove('notices', btn.dataset.id);
                showToast('Item deleted successfully.', 'success');
                renderNoticesPage(); // Refresh the list
            });
        };
    });

    // Listener for the new reply buttons
    document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.onclick = () => {
            const studentId = btn.dataset.authorId; // The author of the message was the student
            const studentName = btn.dataset.authorName;
            // Open the message modal, pre-filling the recipient to the student
            openAdvancedMessageModal(studentId, studentName);
        };
    });
}