import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { generateInitialsAvatar, showConfirmationModal, showToast, timeAgo, openAdvancedMessageModal, openFormModal } from '../utils/helpers.js';

// --- প্রধান ফাংশন ---
export async function renderNoticesPage() {
    // ডেটাবেস থেকে সর্বশেষ তথ্য আনা হচ্ছে
    await Promise.all([
        store.refresh('notices'),
        store.refresh('users'),
        store.refresh('sections'),
        store.refresh('students'),
        store.refresh('timetable')
    ]);

    // শিক্ষক হলে সেকশন ভিত্তিক UI দেখানো হবে
    if (currentUser.role === 'Teacher') {
        renderTeacherSectionSelector();
    } else {
        // অন্যান্য ব্যবহারকারীর জন্য আগের মতোই নোটিশ লিস্ট দেখানো হবে
        renderGenericNoticeList();
    }
}

// --- শিক্ষকদের জন্য সেকশন বাছাই করার UI ---
function renderTeacherSectionSelector() {
    const allSections = store.get('sections');
    const timetable = store.get('timetable');
    const students = store.get('students');

    // শিক্ষকের নিজের সেকশনগুলো খুঁজে বের করা হচ্ছে
    const mySectionIds = new Set();
    allSections.forEach(section => {
        if (section.classTeacherId?.id === currentUser.teacherId) {
            mySectionIds.add(section.id);
        }
    });
    timetable.forEach(entry => {
        if (entry.teacherId?.id === currentUser.teacherId && entry.sectionId?.id) {
            mySectionIds.add(entry.sectionId.id);
        }
    });

    const mySections = Array.from(mySectionIds).map(id => {
        const section = allSections.find(s => s.id === id);
        const studentCount = students.filter(st => st.sectionId?.id === id).length;
        return { ...section, studentCount };
    });

    ui.contentArea.innerHTML = `
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700/70 shadow-2xl animate-fade-in">
            <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <h3 class="text-2xl font-bold text-white">Select a Section</h3>
                 <p class="text-sm text-slate-400">Choose a section to view or create notices.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="section-list-container">
                <!-- Section cards will be rendered here -->
            </div>
        </div>
    `;

    const container = document.getElementById('section-list-container');
    if (mySections.length > 0) {
        container.innerHTML = mySections.map(section => `
            <div class="section-card-notice group relative bg-slate-800/60 p-6 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer" 
                 data-section-id="${section.id}" data-section-name="${section.name}" data-subject-name="${section.subjectId.name}">
                <div class="flex items-center gap-4">
                    <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl">
                        <i class="fas fa-users"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-white text-lg">Section ${section.name}</h4>
                        <p class="text-sm text-slate-400">${section.subjectId.name}</p>
                        <p class="text-xs text-slate-500 mt-1">${section.studentCount} students</p>
                    </div>
                </div>
                <i class="fas fa-arrow-right absolute top-6 right-6 text-slate-600 group-hover:text-blue-400 transition-all transform group-hover:translate-x-1"></i>
            </div>
        `).join('');

        // প্রতিটি সেকশন কার্ডে ক্লিক ইভেন্ট যোগ করা
        document.querySelectorAll('.section-card-notice').forEach(card => {
            card.onclick = () => {
                const section = {
                    id: card.dataset.sectionId,
                    name: card.dataset.sectionName,
                    subjectName: card.dataset.subjectName
                };
                renderNoticeListForSection(section);
            };
        });
    } else {
        container.innerHTML = `<p class="col-span-full text-center py-10 text-slate-500">You are not assigned to any sections.</p>`;
    }
}

// --- নির্দিষ্ট সেকশনের জন্য নোটিশ লিস্ট দেখানোর UI ---
function renderNoticeListForSection(section) {
    const allNotices = store.get('notices');
    const allUsersMap = new Map(store.get('users').map(u => [u.id, u]));
    allUsersMap.set(currentUser.id, currentUser);

    const sectionNotices = allNotices
        .filter(n => n.target === `section_${section.id}`)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    ui.contentArea.innerHTML = `
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700/70 shadow-2xl animate-fade-in">
            <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <div>
                    <button id="back-to-sections" class="text-sm text-blue-400 hover:underline mb-2 flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> Back to Sections
                    </button>
                    <h3 class="text-2xl font-bold text-white">Notices for ${section.subjectName} - Section ${section.name}</h3>
                 </div>
                <button id="add-section-notice-btn" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]">
                    <i class="fas fa-plus"></i> Create New Notice
                </button>
            </div>
            <div id="notice-list-container" class="space-y-6">
                ${sectionNotices.length > 0 ? sectionNotices.map(notice => {
                    const author = allUsersMap.get(notice.authorId) || { name: 'School Admin', profileImage: null };
                    return createPremiumNoticeCard(notice, author);
                }).join('') : `<div class="text-center py-16 text-slate-400"><p>No notices found for this section.</p></div>`}
            </div>
        </div>`;

    document.getElementById('back-to-sections').onclick = renderTeacherSectionSelector;
    
    document.getElementById('add-section-notice-btn').onclick = () => {
        openSectionNoticeModal(section);
    };

    attachNoticeActionListeners();
}

// --- সাধারণ নোটিশ লিস্ট (অ্যাডমিন এবং অন্যান্যদের জন্য) ---
function renderGenericNoticeList() {
    const allNotices = store.get('notices');
    const allUsersMap = new Map(store.get('users').map(u => [u.id, u]));
    allUsersMap.set(currentUser.id, currentUser); // নিজের তথ্যও ম্যাপে যোগ করা

    ui.contentArea.innerHTML = `
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700/70 shadow-2xl animate-fade-in">
            <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <h3 class="text-2xl font-bold text-white">Notice Board</h3>
                ${(currentUser.role === 'Admin') ? // শুধুমাত্র অ্যাডমিন এখন জেনেরিক নোটিশ দেবে
                    `<button id="add-new-notice-btn" class="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02]">
                        <i class="fas fa-plus"></i> Create New Notice
                     </button>`
                    : ''}
            </div>
            <div id="notice-list-container" class="space-y-6"></div>
        </div>`;

    const noticeListContainer = document.getElementById('notice-list-container');
    
    // --- নোটিশ ফিল্টারিং লজিক (সবচেয়ে গুরুত্বপূর্ণ অংশ) ---
    const relevantNotices = allNotices.filter(n => {
        if (n.authorId === currentUser.id) return true;
        if (n.type === 'private_message' && n.target === currentUser.id) return true;
        
        if (n.type === 'notice') {
            switch (currentUser.role) {
                case 'Admin':
                    return ['All', 'Staff', 'Teacher', 'Student'].includes(n.target);
                
                // শিক্ষকের জন্য এই লজিক এখন আর এখানে ব্যবহৃত হবে না, কারণ তারা সেকশনভিত্তিক UI দেখবে
                case 'Teacher':
                    return ['All', 'Staff', 'Teacher'].includes(n.target);

                case 'Student':
                    // ** ছাত্রছাত্রীরা এখন তাদের নিজেদের সেকশনের নোটিশও দেখতে পাবে **
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
    } else {
        noticeListContainer.innerHTML = relevantNotices.map(notice => {
            const author = allUsersMap.get(notice.authorId) || { name: 'School Admin', profileImage: null };
            return createPremiumNoticeCard(notice, author);
        }).join('');
        attachNoticeActionListeners();
    }

    const addNewNoticeBtn = document.getElementById('add-new-notice-btn');
    if (addNewNoticeBtn) {
        addNewNoticeBtn.onclick = () => openAdvancedMessageModal();
    }
}


// --- সেকশন ভিত্তিক নোটিশ তৈরির মডাল ---
function openSectionNoticeModal(section) {
    const formFields = [
        { name: 'title', label: 'Notice Title', type: 'text', required: true, placeholder: 'e.g., Upcoming Holiday' },
        { name: 'content', label: 'Notice Content', type: 'textarea', required: true, rows: 5 },
    ];

    openFormModal(`New Notice for Section ${section.name}`, formFields, async (formData) => {
        const noticeData = {
            ...formData,
            date: new Date().toISOString(),
            authorId: currentUser.id,
            type: 'notice',
            // ** সবচেয়ে গুরুত্বপূর্ণ: টার্গেট হিসেবে সেকশন আইডি সেট করা হচ্ছে **
            target: `section_${section.id}`,
        };
        
        if (await apiService.create('notices', noticeData)) {
            showToast('Notice posted successfully!', 'success');
            await store.refresh('notices');
            renderNoticeListForSection(section); // নোটিশ লিস্ট রিফ্রেশ করা
        }
    });
}


// --- নোটিশ কার্ড তৈরির ফাংশন (কিছুটা পরিবর্তন করা হয়েছে) ---
export function createPremiumNoticeCard(notice, author) {
    const isPrivate = notice.type === 'private_message';
    let cardClasses, iconClasses, badgeClasses, ribbonContent;
    
    if (isPrivate) {
        // প্রাইভেট মেসেজের স্টাইল আগের মতোই থাকবে
        const recipient = store.get('users').find(u => u.id === notice.target);
        cardClasses = "border-l-4 border-purple-500 bg-gradient-to-br from-slate-800/70 to-slate-900/80";
        iconClasses = "fas fa-user-secret text-purple-400";
        badgeClasses = "bg-purple-500/20 text-purple-400";
        ribbonContent = `Private to ${recipient?.name || 'user'}`;
    } else if (notice.target.startsWith('section_')) {
        // ** নতুন: সেকশন নোটিশের জন্য আলাদা স্টাইল **
        const sectionId = notice.target.replace('section_', '');
        const section = store.get('sections').find(s => s.id === sectionId);
        cardClasses = "border-l-4 border-rose-500 bg-gradient-to-br from-slate-800/70 to-slate-900/80";
        iconClasses = "fas fa-users text-rose-400";
        badgeClasses = "bg-rose-500/20 text-rose-400";
        ribbonContent = `For Section ${section?.name || 'N/A'}`;
    } else {
        // জেনেরিক নোটিশের জন্য আগের স্টাইল
        switch (notice.target) {
            case 'All':
                cardClasses = "border-l-4 border-blue-500"; iconClasses = "fas fa-bullhorn text-blue-400"; badgeClasses = "bg-blue-500/20 text-blue-400"; ribbonContent = "Public Notice"; break;
            case 'Student':
                cardClasses = "border-l-4 border-green-500"; iconClasses = "fas fa-user-graduate text-green-400"; badgeClasses = "bg-green-500/20 text-green-400"; ribbonContent = "For Students"; break;
            case 'Teacher':
                cardClasses = "border-l-4 border-amber-500"; iconClasses = "fas fa-chalkboard-teacher text-amber-400"; badgeClasses = "bg-amber-500/20 text-amber-400"; ribbonContent = "For Teachers"; break;
            default:
                cardClasses = "border-l-4 border-gray-500"; iconClasses = "fas fa-info-circle text-gray-400"; badgeClasses = "bg-gray-500/20 text-gray-400"; ribbonContent = "Notice"; break;
        }
    }

    let actionButtons = '';
    if (currentUser.role === 'Admin' || notice.authorId === currentUser.id) {
        actionButtons = `<button class="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-500/10 transition-all delete-btn" title="Delete" data-id="${notice.id}"><i class="fas fa-trash-alt"></i></button>`;
    }

    const authorAvatar = author.profileImage || generateInitialsAvatar(author.name);
    const formattedDate = new Date(notice.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

    return `
    <div class="${cardClasses} bg-gradient-to-br from-slate-800/70 to-slate-900/80 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] group">
        <div class="absolute top-0 right-0 px-3 py-1 text-xs font-semibold ${badgeClasses} rounded-bl-lg">${ribbonContent}</div>
        <div class="p-5"><div class="flex items-start gap-4">
            <div class="flex-shrink-0 mt-1"><div class="w-10 h-10 rounded-lg ${badgeClasses.replace('text', 'bg')} flex items-center justify-center"><i class="${iconClasses}"></i></div></div>
            <div class="flex-grow">
                <div class="flex justify-between items-start gap-2">
                    <div><h4 class="text-xl font-bold text-white">${notice.title}</h4><div class="flex items-center gap-2 mt-1"><span class="text-xs text-slate-400">${formattedDate}</span></div></div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">${actionButtons}</div>
                </div>
                <div class="mt-4 pl-1"><p class="text-slate-300 whitespace-pre-wrap">${notice.content}</p></div>
                <div class="flex items-center justify-between mt-5 pt-4 border-t border-slate-700/50">
                    <div class="flex items-center gap-3">
                        <img src="${authorAvatar}" alt="${author.name}" class="w-8 h-8 rounded-full object-cover border-2 border-slate-700">
                        <div><p class="text-sm font-medium text-slate-300">${author.name}</p><p class="text-xs text-slate-500">${author.role || 'Staff'}</p></div>
                    </div>
                    <div class="text-xs text-slate-500"><i class="far fa-clock mr-1"></i> ${timeAgo(notice.date)}</div>
                </div>
            </div>
        </div></div>
    </div>`;
}

// --- ইভেন্ট লিসেনার ফাংশন (আগের মতোই) ---
export function attachNoticeActionListeners() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => {
            showConfirmationModal('Are you sure you want to delete this notice/message?', async () => {
                if(await apiService.remove('notices', btn.dataset.id)){
                    showToast('Item deleted successfully.', 'success');
                    renderNoticesPage(); // পুরো পেজ রিফ্রেশ হবে
                }
            });
        };
    });
}