// in frontend/src/pages/notices.js

import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { generateInitialsAvatar, showConfirmationModal, showToast, timeAgo, openAdvancedMessageModal, openFormModal } from '../utils/helpers.js';

// --- প্রধান ফাংশন ---
export async function renderNoticesPage() {
    await Promise.all([
        store.refresh('notices'),
        store.refresh('users'),
        store.refresh('sections'),
        store.refresh('students'), // Ensure students are available for counts
        store.refresh('timetable')
    ]);

    if (currentUser.role === 'Teacher') {
        renderTeacherSectionSelector();
    } else {
        renderGenericNoticeList();
    }
}

// --- শিক্ষকদের জন্য প্রিমিয়াম সেকশন বাছাই করার UI ---
function renderTeacherSectionSelector() {
    const allSections = store.get('sections');
    const timetable = store.get('timetable');

    const mySectionIds = new Set();
    allSections.forEach(section => {
        if (section.classTeacherId?.id === currentUser.teacherId) mySectionIds.add(section.id);
    });
    timetable.forEach(entry => {
        if (entry.teacherId?.id === currentUser.teacherId && entry.sectionId?.id) mySectionIds.add(entry.sectionId.id);
    });

    const mySections = Array.from(mySectionIds).map(id => {
        const section = allSections.find(s => s.id === id);
        if (!section) return null;
        const studentCount = store.get('students').filter(st => st.sectionId?.id === id).length;
        return { ...section, studentCount };
    }).filter(Boolean);

    ui.contentArea.innerHTML = `
        <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in">
            <div class="mb-6">
                <h3 class="text-2xl font-bold text-white">Select a Section</h3>
                <p class="text-slate-400 mt-1">Choose a section to manage notices.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                ${mySections.length > 0 ? mySections.map(section => `
                    <div class="section-card-notice group" 
                         data-section-id="${section.id}" 
                         data-section-name="${section.name}" 
                         data-subject-name="${section.subjectId?.name || 'N/A'}">
                        <div class="flex items-center gap-4">
                            <div class="card-icon"><i class="fas fa-users"></i></div>
                            <div>
                                <h4 class="card-title">Section ${section.name}</h4>
                                <p class="card-subtitle">${section.subjectId?.name || 'N/A'} (${section.studentCount} students)</p>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right card-arrow"></i>
                    </div>
                `).join('') : `
                <div class="col-span-full text-center py-12 text-slate-500">
                    You are not assigned to any sections.
                </div>`}
            </div>
        </div>
    `;

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
}

// --- নির্দিষ্ট সেকশনের জন্য নোটিশ লিস্ট দেখানোর UI ---
function renderNoticeListForSection(section) {
    const sectionNotices = store.get('notices')
        .filter(n => n.target === `section_${section.id}`)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    ui.contentArea.innerHTML = `
        <div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in">
            <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
                 <div>
                    <button id="back-to-sections" class="text-sm text-blue-400 hover:underline mb-2 flex items-center gap-2">
                        <i class="fas fa-chevron-left"></i> Back to Sections
                    </button>
                    <h3 class="text-2xl font-bold text-white">Notices for ${section.subjectName} - Section ${section.name}</h3>
                 </div>
                <button id="add-section-notice-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <i class="fas fa-plus"></i> Create Notice
                </button>
            </div>
            <div id="notice-list-container" class="space-y-6">
                ${sectionNotices.length > 0 ? sectionNotices.map(notice => createPremiumNoticeCard(notice)).join('') : `<div class="text-center py-16 text-slate-400"><p>No notices found for this section.</p></div>`}
            </div>
        </div>`;

    document.getElementById('back-to-sections').onclick = renderTeacherSectionSelector;
    document.getElementById('add-section-notice-btn').onclick = () => openSectionNoticeModal(section);
    attachNoticeActionListeners();
}

function openSectionNoticeModal(section) {
    const formFields = [{ name: 'title', label: 'Notice Title', type: 'text', required: true }, { name: 'content', label: 'Notice Content', type: 'textarea', required: true, rows: 5 }];
    openFormModal(`New Notice for Section ${section.name}`, formFields, async (formData) => {
        const noticeData = { ...formData, date: new Date().toISOString(), authorId: currentUser.id, type: 'notice', target: `section_${section.id}` };
        if (await apiService.create('notices', noticeData)) {
            showToast('Notice posted!', 'success');
            await store.refresh('notices');
            renderNoticeListForSection(section);
        }
    });
}

function renderGenericNoticeList() {
    const allNotices = store.get('notices');
    const relevantNotices = allNotices.filter(n => {
        if (!n.target) return false; // Safety check for corrupted data
        if (n.authorId === currentUser.id) return true;
        if (n.type === 'private_message' && n.target === currentUser.id) return true;
        if (n.type === 'notice') {
            switch (currentUser.role) {
                case 'Admin': return ['All', 'Staff', 'Teacher', 'Student'].includes(n.target);
                case 'Teacher': return ['All', 'Staff', 'Teacher'].includes(n.target);
                case 'Student': return ['All', 'Student', `section_${currentUser.sectionId}`].includes(n.target);
                default: return ['All', 'Staff'].includes(n.target);
            }
        } return false;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    ui.contentArea.innerHTML = `<div class="bg-slate-800/50 p-6 rounded-xl border border-slate-700 shadow-md animate-fade-in"><div class="flex justify-between items-center mb-6"><h3 class="text-2xl font-bold text-white">Notice Board</h3>${currentUser.role === 'Admin' ? `<button id="add-new-notice-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Create</button>` : ''}</div><div id="notice-list-container" class="space-y-6">${relevantNotices.length > 0 ? relevantNotices.map(createPremiumNoticeCard).join('') : `<div class="text-center py-16 text-slate-400"><p>No notices found.</p></div>`}</div></div>`;
    
    document.getElementById('add-new-notice-btn')?.addEventListener('click', () => openAdvancedMessageModal());
    attachNoticeActionListeners();
}

export function createPremiumNoticeCard(notice) {
    const allUsersMap = new Map(store.get('users').map(u => [u.id, u]));
    allUsersMap.set(currentUser.id, currentUser);
    const author = allUsersMap.get(notice.authorId) || { name: 'School Admin', profileImage: null };

    const likes = notice.reactions.filter(r => r.type === '👍');
    const dislikes = notice.reactions.filter(r => r.type === '👎');

    const likedByUsers = likes.map(r => allUsersMap.get(r.userId.toString())?.name).filter(Boolean).join(', ');
    const dislikedByUsers = dislikes.map(r => allUsersMap.get(r.userId.toString())?.name).filter(Boolean).join(', ');

    const currentUserReaction = notice.reactions.find(r => r.userId === currentUser.id);

    let ribbonContent;
    // Defensive check for target
    if (notice.target && typeof notice.target === 'string') {
        if (notice.type === 'private_message') {
            ribbonContent = `<div class="card-ribbon bg-purple-500/20 text-purple-400">Private Message</div>`;
        } else if (notice.target.startsWith('section_')) {
            const section = store.get('sections').find(s => s.id === notice.target.replace('section_', ''));
            ribbonContent = `<div class="card-ribbon bg-rose-500/20 text-rose-400">For Section ${section?.name || ''}</div>`;
        } else {
            const targetText = { 'All': 'Public', 'Student': 'For Students', 'Teacher': 'For Teachers' }[notice.target] || 'Notice';
            const ribbonColor = { 'All': 'blue', 'Student': 'green', 'Teacher': 'amber' }[notice.target] || 'gray';
            ribbonContent = `<div class="card-ribbon bg-${ribbonColor}-500/20 text-${ribbonColor}-400">${targetText}</div>`;
        }
    } else {
        ribbonContent = `<div class="card-ribbon bg-gray-500/20 text-gray-400">Unknown Target</div>`;
    }

    let actionButtons = '';
    if (currentUser.role === 'Admin' || notice.authorId === currentUser.id) {
        actionButtons = `<button class="delete-btn" title="Delete" data-id="${notice.id}"><i class="fas fa-trash-alt"></i></button>`;
    }

    let reactionSectionHtml = '';
    if (notice.type === 'notice') {
        reactionSectionHtml = `
            <div class="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between flex-wrap gap-4">
                <div class="flex items-center gap-2">
                    <button class="reaction-btn ${currentUserReaction?.type === '👍' ? 'active-like' : ''}" data-id="${notice.id}" data-reaction-type="👍">
                        <span>👍</span> <span>${likes.length}</span>
                    </button>
                    <button class="reaction-btn ${currentUserReaction?.type === '👎' ? 'active-dislike' : ''}" data-id="${notice.id}" data-reaction-type="👎">
                        <span>👎</span> <span>${dislikes.length}</span>
                    </button>
                </div>
                <div class="flex items-center gap-4">
                    ${likes.length > 0 ? `<div class="reaction-display" title="Liked by: ${likedByUsers}"><i class="fas fa-thumbs-up text-blue-400"></i><span>${likes.length} like${likes.length > 1 ? 's' : ''}</span></div>` : ''}
                    ${dislikes.length > 0 ? `<div class="reaction-display" title="Disliked by: ${dislikedByUsers}"><i class="fas fa-thumbs-down text-red-400"></i><span>${dislikes.length} dislike${dislikes.length > 1 ? 's' : ''}</span></div>` : ''}
                </div>
            </div>`;
    }

    return `
        <div class="premium-notice-card">
        ${ribbonContent}
        <div class="p-5">
            <div class="flex justify-between items-start gap-2">
                <h4 class="text-xl font-bold text-white">${notice.title}</h4>
                <div class="flex items-center gap-4">
                     <div class="text-right">
                        <p class="text-sm font-medium text-slate-300">${author.name}</p>
                        <p class="text-xs text-slate-500">${timeAgo(notice.date)}</p>
                    </div>
                    <!-- ANALYSIS: THE FINAL FIX -->
                    <!-- The src now directly uses author.profileImage because it's a full URL.
                         The broken API_BASE_URL prefix has been removed. -->
                    <img src="${author.profileImage || generateInitialsAvatar(author.name)}" 
                         alt="${author.name}" 
                         class="w-9 h-9 rounded-full object-cover">
                         
                    <div class="card-actions">${actionButtons}</div>
                </div>
            </div>
            <p class="text-slate-300 whitespace-pre-wrap mt-2">${notice.content}</p>
            ${reactionSectionHtml}
        </div>
    </div>`;
}

export function attachNoticeActionListeners() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => showConfirmationModal('Are you sure you want to delete this notice?', async () => {
            if (await apiService.remove('notices', btn.dataset.id)) {
                showToast('Notice removed.', 'success');
                renderNoticesPage();
            }
        });
    });

    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.onclick = async () => {
            const noticeId = btn.dataset.id;
            const reactionType = btn.dataset.reactionType;
            btn.disabled = true;
            const result = await apiService.reactToNotice(noticeId, reactionType);
            if (result) {
                await store.refresh('notices');
                renderNoticesPage();
            } else {
                btn.disabled = false;
            }
        };
    });
}