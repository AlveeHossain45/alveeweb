// frontend/src/utils/helpers.js

import { apiService } from '../apiService.js';
import { renderStaffPage } from '../pages/staff.js';
import { renderStudentsPage } from '../pages/students.js';
import { renderTeachersPage } from '../pages/teachers.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { renderNoticesPage } from '../pages/notices.js';

// Your API base URL
const API_BASE_URL = 'https://smsv2-liart.vercel.app';

// Safely compose URLs (ensures single slash between base and path)
const apiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

export function getSkeletonLoaderHTML(type = 'table') {
    if (type === 'dashboard') {
        return `
            <div class="animate-pulse">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="h-28 bg-slate-700/50 rounded-xl"></div>
                    <div class="h-28 bg-slate-700/50 rounded-xl"></div>
                    <div class="h-28 bg-slate-700/50 rounded-xl"></div>
                    <div class="h-28 bg-slate-700/50 rounded-xl"></div>
                </div>
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 h-80 bg-slate-700/50 rounded-xl"></div>
                    <div class="h-80 bg-slate-700/50 rounded-xl"></div>
                </div>
            </div>`;
    }
    // Default to table loader
    return `
        <div class="animate-pulse space-y-4 p-6">
            <div class="flex justify-between items-center">
                <div class="h-8 w-48 bg-slate-700/50 rounded-md"></div>
                <div class="h-10 w-32 bg-slate-700/50 rounded-md"></div>
            </div>
            <div class="h-96 bg-slate-700/50 rounded-xl mt-4"></div>
        </div>
    `;
}

// --- THIS FUNCTION WAS REPLACED TO USE FETCH AND YOUR API BASE URL ---
export async function openAdvancedMessageModal(replyToUserId = null, replyToUserName = null) {
    const classes = store.get('classes') || [];
    const teacherMap = store.getMap('teachers') || new Map();
    const studentsMap = store.getMap('students') || new Map();

    // Get users list robustly from store (fixes Object.values('users') bug)
    let users = [];
    const usersFromStore = store.get('users');
    if (Array.isArray(usersFromStore)) {
        users = usersFromStore;
    } else {
        const usersMap = store.getMap('users');
        if (usersMap && typeof usersMap.values === 'function') {
            users = Array.from(usersMap.values());
        }
    }

    const allStaff = users
        .filter(user => user.role && user.role !== 'Student')
        .map(user => {
            let staffName = user.name || 'Unnamed Staff';
            let staffTargetId = user.id || user.email || user.username;

            if (user.role === 'Teacher' && user.teacherId) {
                const teacherDetails = teacherMap.get(user.teacherId);
                if (teacherDetails) {
                    staffName = teacherDetails.name || staffName;
                    staffTargetId = teacherDetails.id || user.teacherId;
                } else {
                    staffTargetId = user.teacherId;
                }
            }

            return { id: String(staffTargetId), name: staffName, role: user.role };
        });

    let modalTitle = 'Send New Notice / Message';
    let isReply = false;
    if (replyToUserId && replyToUserName) {
        modalTitle = `Reply to ${replyToUserName}`;
        isReply = true;
    }

    const groupedOptions = {
        'Broadcasts': [],
        'Classes': [],
        'Direct to Staff': [],
        'Direct to Student': []
    };

    // Populate Broadcast options
    if (currentUser.role === 'Admin') {
        groupedOptions['Broadcasts'].push(
            { value: 'All', label: 'Everyone (All Staff & Students)' },
            { value: 'Staff', label: 'All Staff Members' },
            { value: 'Teacher', label: 'All Teachers' },
            { value: 'Student', label: 'All Students' }
        );
    }

    // Populate Class options
    const classList = (currentUser.role === 'Teacher') ? classes.filter(c => c.teacherId === currentUser.id) : classes;
    classList.forEach(c => groupedOptions['Classes'].push({ value: `class_${c.id}`, label: c.name }));

    // Populate Direct Message options
    if (currentUser.role === 'Admin') {
        allStaff.forEach(s => groupedOptions['Direct to Staff'].push({ value: s.id, label: `${s.name} (${s.role})` }));
    }
    if (currentUser.role === 'Teacher' && !isReply) { // Only show admin if not a reply
         groupedOptions['Direct to Staff'].push({ value: 'admin', label: 'Admin' });
    }
    if (isReply) {
        groupedOptions['Direct to Student'].push({ value: replyToUserId, label: `${replyToUserName} (Student)` });
    }

    const optionsHtml = Object.entries(groupedOptions)
        .filter(([_, options]) => options.length > 0)
        .map(([group, options]) => `<optgroup label="${group}">${options.map(opt => `<option value="${opt.value}" ${isReply && opt.value === replyToUserId ? 'selected' : ''}>${opt.label}</option>`).join('')}</optgroup>`)
        .join('');

    const formFields = [
        { name: 'target', label: 'Recipient', type: 'select', required: true, options: optionsHtml },
        { name: 'title', label: 'Title / Subject', type: 'text', required: true, value: isReply ? `Re: Your message` : '' },
        { name: 'content', label: 'Message Content', type: 'textarea', required: true },
    ];

    openFormModal(modalTitle, formFields, async (formData) => {
        const isPrivate = !['All', 'Staff', 'Teacher', 'Student'].includes(formData.target) && !formData.target.startsWith('class_');

        const noticeData = {
            ...formData,
            authorId: currentUser.id || currentUser.username,
            date: new Date().toISOString(),
            type: isPrivate ? 'private_message' : 'notice'
        };

        // --- THIS IS THE FIX ---
        // The manual fetch call with the wrong URL has been replaced.
        // We now use the centralized apiService, which constructs the correct URL.
        const result = await apiService.create('notices', noticeData);
        // --- END OF FIX ---

        if (!result) return;

        showToast(`Message sent successfully!`, 'success');

        if (document.getElementById('notice-list-container')) {
            renderNoticesPage();
        }
    });

    if (isReply) {
         setTimeout(() => {
            const targetSelect = document.getElementById('target');
            if (targetSelect) targetSelect.disabled = true;
        }, 100);
    }
}

export function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;

    return "just now";
}

export function getFileIcon(fileType) {
    if (fileType.includes('image')) return 'fa-file-image';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('word')) return 'fa-file-word';
    if (fileType.includes('excel')) return 'fa-file-excel';
    if (fileType.includes('powerpoint')) return 'fa-file-powerpoint';
    if (fileType.includes('zip')) return 'fa-file-archive';
    return 'fa-file';
}

export function createNoticeCard(notice, authorName) {
    let audienceText, borderColorClass;
    const isPrivateMessage = notice.type === 'private_message';
    const allUsersMap = new Map([...store.getMap('students'), ...store.getMap('teachers')]);

    if (isPrivateMessage) {
        const recipientName = allUsersMap.get(notice.target)?.name || 'a specific user';
        audienceText = `Private to: ${recipientName}`;
        borderColorClass = 'border-purple-500';
    } else if (notice.target === 'All') {
        audienceText = 'For: Everyone';
        borderColorClass = 'border-blue-500';
    } else if (notice.target === 'Student') {
        audienceText = 'For: All Students';
        borderColorClass = 'border-green-500';
    } else if (notice.target === 'Teacher') {
        audienceText = 'For: All Teachers';
        borderColorClass = 'border-yellow-500';
    } else if (notice.target.startsWith('class_')) {
        const className = store.getMap('classes').get(notice.target.split('_')[1])?.name || 'a Specific Class';
        audienceText = `For: ${className}`;
        borderColorClass = 'border-red-500';
    } else {
        audienceText = `For: ${notice.target}`;
        borderColorClass = 'border-teal-500';
    }

    let actionButtonsHtml = '';
    if (currentUser.role === 'Teacher' && isPrivateMessage && notice.authorId !== currentUser.id) {
        const authorIsStudent = store.getMap('students').has(notice.authorId);
        if (authorIsStudent) {
            actionButtonsHtml += `<button class="text-blue-400 hover:text-blue-300 reply-btn p-1" title="Reply" data-author-id="${notice.authorId}" data-author-name="${authorName}"><i class="fas fa-reply fa-fw"></i></button>`;
        }
    }
    if (currentUser.role === 'Admin' || currentUser.id === notice.authorId) {
        actionButtonsHtml += `<button class="text-red-500 hover:text-red-400 delete-btn p-1 ml-2" title="Delete" data-id="${notice.id}"><i class="fas fa-trash-alt fa-fw"></i></button>`;
    }

    const timestamp = new Date(notice.date).toLocaleString('en-US', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    return `
        <div class="p-4 border-l-4 ${borderColorClass} bg-slate-800/70 rounded-r-lg shadow-md flex flex-col justify-between transition-shadow duration-300 hover:shadow-lg">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <p class="font-bold text-lg text-white">${notice.title}</p>
                        <div class="flex items-center text-xs text-slate-400 mt-1 space-x-2">
                            <span><i class="fas fa-user-edit mr-1"></i>From: ${authorName}</span>
                            <span class="text-slate-600">|</span>
                            <span><i class="fas fa-bullhorn mr-1"></i>${audienceText}</span>
                        </div>
                    </div>
                    <div class="flex-shrink-0">
                        ${actionButtonsHtml}
                    </div>
                </div>
                <p class="text-slate-300 text-sm mt-3 whitespace-pre-wrap">${notice.content}</p>
                <p class="text-right text-xs text-slate-500 mt-3">${timestamp}</p>
            </div>
        </div>`;
}

export async function handleVoiceRecording(sendMessageCallback) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording is not supported on your browser.', 'error');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];

        const recordModal = document.createElement('div');
        recordModal.className = 'fixed inset-0 bg-black/70 flex justify-center items-center z-50';
        recordModal.innerHTML = `
            <div class="bg-slate-800 p-8 rounded-xl text-center shadow-2xl animate-fade-in">
                <i class="fas fa-microphone-alt text-red-500 text-5xl animate-pulse"></i>
                <p class="text-white text-lg mt-4">Recording... <span id="record-timer">0s</span></p>
                <button id="stop-record-btn" class="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Stop</button>
            </div>
        `;
        document.body.appendChild(recordModal);

        let seconds = 0;
        const timerInterval = setInterval(() => {
            seconds++;
            document.getElementById('record-timer').textContent = `${seconds}s`;
        }, 1000);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            clearInterval(timerInterval);
            document.body.removeChild(recordModal);

            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = (event) => {
                sendMessageCallback(event.target.result, 'audio');
            };
            reader.readAsDataURL(audioBlob);
        };

        document.getElementById('stop-record-btn').onclick = () => {
            mediaRecorder.stop();
        };

        mediaRecorder.start();

    } catch (err) {
        console.error("Error accessing microphone:", err);
        showToast('Microphone access was denied or an error occurred.', 'error');
    }
}

export async function fetchWithErrorHandling(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(await res.text());
        return await res.json();
    } catch (err) {
        showToast('Network error: ' + err.message, 'error');
        return null;
    }
}

export async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    // ...submit logic...
    btn.disabled = false;
    btn.innerHTML = 'Save';
}

export function renderLargeList(items, containerId) {
    const container = document.getElementById(containerId);
    let i = 0;
    function renderChunk() {
        const chunk = items.slice(i, i + 50).map(item => `<div>${item.name}</div>`).join('');
        container.insertAdjacentHTML('beforeend', chunk);
        i += 50;
        if (i < items.length) requestAnimationFrame(renderChunk);
    }
    container.innerHTML = '';
    renderChunk();
}

export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

export function openBulkInsertModal(collectionName, title, requiredFields, exampleObject) {
    const modalTitle = `Bulk Insert ${title}`;
    const exampleJson = JSON.stringify([exampleObject], null, 2);

    const formHtml = `
        <div class="space-y-4">
            <p class="text-slate-400">Upload a <code class="text-sm bg-slate-900 p-1 rounded">.json</code> or <code class="text-sm bg-slate-900 p-1 rounded">.csv</code> file. The file must be an array of objects.</p>
            <div>
                <label for="bulk-file-input" class="block text-sm font-medium text-slate-300">Select File</label>
                <input type="file" id="bulk-file-input" accept=".json,.csv" class="mt-1 block w-full text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"/>
            </div>
            <div id="bulk-feedback" class="text-sm p-3 bg-slate-900/50 rounded-lg hidden"></div>
            <div>
                <h4 class="font-semibold text-slate-200 mt-6 mb-2">Required Fields:</h4>
                <div class="flex flex-wrap gap-2">
                    ${requiredFields.map(field => `<code class="text-xs bg-slate-700 text-slate-300 p-1 rounded">${field}</code>`).join('')}
                </div>
            </div>
            <div>
                <h4 class="font-semibold text-slate-200 mt-4 mb-2">Example JSON Structure:</h4>
                <pre class="bg-slate-900 p-3 rounded-lg text-xs custom-scrollbar overflow-x-auto"><code>${exampleJson}</code></pre>
            </div>
        </div>
        <div class="pt-4 mt-4 flex justify-end border-t border-slate-600">
            <button id="process-bulk-file-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" disabled>Process File</button>
        </div>
    `;

    ui.modalTitle.textContent = modalTitle;
    ui.modalBody.innerHTML = formHtml;
    openAnimatedModal(ui.modal);

    const fileInput = document.getElementById('bulk-file-input');
    const processBtn = document.getElementById('process-bulk-file-btn');
    const feedbackDiv = document.getElementById('bulk-feedback');
    let parsedData = [];

    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
            processBtn.disabled = true;
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                if (file.name.endsWith('.json')) {
                    parsedData = JSON.parse(content);
                } else if (file.name.endsWith('.csv')) {
                    // Simple CSV parser
                    const lines = content.trim().split('\n');
                    const headers = lines[0].split(',').map(h => h.trim());
                    parsedData = lines.slice(1).map(line => {
                        const values = line.split(',').map(v => v.trim());
                        return headers.reduce((obj, header, index) => {
                            obj[header] = values[index];
                            return obj;
                        }, {});
                    });
                }
                if (!Array.isArray(parsedData)) throw new Error('File content must be an array of objects.');
                feedbackDiv.innerHTML = `<span class="text-green-400">${parsedData.length} records found in file. Ready to process.</span>`;
                feedbackDiv.classList.remove('hidden');
                processBtn.disabled = false;
            } catch (err) {
                feedbackDiv.innerHTML = `<span class="text-red-400">Error parsing file: ${err.message}</span>`;
                feedbackDiv.classList.remove('hidden');
                processBtn.disabled = true;
            }
        };
        reader.readAsText(file);
    };

    processBtn.onclick = async () => {
        processBtn.disabled = true;
        processBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const validRecords = [];
        const invalidRecords = [];
        for (const record of parsedData) {
            const hasAllRequiredFields = requiredFields.every(field => record[field] !== undefined && record[field] !== '');
            if (hasAllRequiredFields) {
                validRecords.push(record);
            } else {
                invalidRecords.push(record);
            }
        }

        if (invalidRecords.length > 0) {
            showToast(`${invalidRecords.length} records are missing required fields and were skipped.`, 'error');
        }

        if (validRecords.length === 0) {
            processBtn.innerHTML = 'Process File';
            feedbackDiv.innerHTML = `<span class="text-red-400">No valid records to import. Please check your file.</span>`;
            return;
        }

        // POST to your hosted API (bulk insert)
        const result = await fetchWithErrorHandling(apiUrl(`/api/${collectionName}/bulk`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validRecords)
        });

        if (result && result.success) {
            feedbackDiv.innerHTML = `
                <p class="text-green-400 font-bold">Import Complete!</p>
                <p>Successfully inserted: ${result.insertedCount}</p>
                <p class="text-yellow-400">Failed due to validation errors: ${result.failedCount}</p>
            `;
            showToast('Bulk import completed!', 'success');
            if (collectionName === 'students') renderStudentsPage();
            if (collectionName === 'teachers') renderTeachersPage();
            if (collectionName === 'users') renderStaffPage();
        } else {
            feedbackDiv.innerHTML = `<span class="text-red-400">An error occurred on the server.</span>`;
            processBtn.innerHTML = 'Process File';
        }

        processBtn.disabled = false;
    };
}

export function generateInitialsAvatar(name) {
    if (!name) name = 'U';
    const nameParts = name.trim().split(' ');
    let initials = nameParts[0].charAt(0);
    if (nameParts.length > 1) {
        initials += nameParts[nameParts.length - 1].charAt(0);
    }
    initials = initials.toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#e0ebf3ff"/><text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-size="45" font-family="Inter, sans-serif" font-weight="bold" fill="#000000ff">${initials}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const createDashboardCard = ({ title, value, icon, color }) => {
    const colorMap = {
        indigo: 'from-indigo-500 to-indigo-700',
        yellow: 'from-yellow-500 to-yellow-600',
        blue: 'from-blue-500 to-blue-700',
        green: 'from-green-500 to-green-700',
        red: 'from-red-500 to-red-700',
        purple: 'from-purple-500 to-purple-700',
    };
    return `
        <div class="dashboard-card bg-gradient-to-br ${colorMap[color] || colorMap.blue} p-6 rounded-xl shadow-lg transform transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
            <div class="absolute -right-4 -top-4 text-white text-6xl opacity-20 pointer-events-none"><i class="fas ${icon}"></i></div>
            <div class="relative z-10">
                <p class="text-sm font-medium text-white text-opacity-80">${title}</p>
                <p class="text-3xl font-bold text-white mt-1">${value}</p>
            </div>
        </div>
    `;
};

export function calculateOverdueDays(dueDate) {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (today <= due) {
        return 0;
    }
    const differenceInTime = today.getTime() - due.getTime();
    return Math.ceil(differenceInTime / (1000 * 3600 * 24));
}

export function createUpcomingExamCard(exam) {
    const subjectName = exam.subjectId?.name || 'N/A';
    const eventDate = new Date(exam.date);
    const date = eventDate.getDate();
    const month = eventDate.toLocaleString('default', { month: 'short' });

    const [hoursStr, minutes] = exam.time.split(':');
    const hours = Number(hoursStr);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes} ${ampm}`;

    return `
        <div class="flex items-center gap-4 bg-slate-700/30 p-3 rounded-lg">
            <div class="text-center bg-blue-900/50 text-blue-300 rounded-lg px-3 py-1">
                <p class="font-bold text-lg">${date}</p>
                <p class="text-xs font-medium">${month}</p>
            </div>
            <div>
                <p class="font-bold">${exam.name} - ${subjectName}</p>
                <p class="text-sm text-slate-400">${eventDate.toLocaleDateString('en-GB')} at ${formattedTime}</p>
            </div>
        </div>
    `;
}

export function renderDashboardCharts(fees, students) {
    const gridColor = 'rgba(255, 255, 255, 0.1)';
    const textColor = '#e2e8f0';

    const feesCtx = document.getElementById('feesChart')?.getContext('2d');
    if (feesCtx && fees) {
        const paidAmount = fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
        const unpaidAmount = fees.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0);
        new Chart(feesCtx, {
            type: 'bar',
            data: {
                labels: ['Paid', 'Unpaid'],
                datasets: [{
                    label: 'Fee Amount (BDT)', data: [paidAmount, unpaidAmount],
                    backgroundColor: ['rgba(34, 197, 94, 0.6)', 'rgba(239, 68, 68, 0.6)'],
                    borderColor: ['#22c55e', '#ef4444'], borderWidth: 1
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { display: false } } } }
        });
    }

    const genderCtx = document.getElementById('genderChart')?.getContext('2d');
    if (genderCtx && students) {
        const maleCount = students.filter(s => s.gender === 'Male').length;
        const femaleCount = students.filter(s => s.gender === 'Female').length;
        new Chart(genderCtx, {
            type: 'doughnut',
            data: {
                labels: ['Male', 'Female'],
                datasets: [{ data: [maleCount, femaleCount], backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(236, 72, 153, 0.7)'], borderColor: ['#3b82f6', '#ec4899'], borderWidth: 1 }]
            },
            options: { responsive: true, plugins: { legend: { position: 'top', labels: { color: textColor } } } }
        });
    }
}

export function showImageViewer(imageSrc) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/80 flex justify-center items-center z-50 cursor-pointer animate-in';
    overlay.innerHTML = `<img src="${imageSrc}" class="max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-2xl">`;
    document.body.appendChild(overlay);
    overlay.onclick = () => {
        overlay.classList.replace('animate-fade-in', 'animate-fade-out');
        overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
    };
}

export function openAnimatedModal(modalElement) {
    modalElement.style.display = 'flex';
    setTimeout(() => modalElement.classList.add('show'), 10);
}

export function closeAnimatedModal(modalElement) {
    modalElement.classList.remove('show');
    modalElement.addEventListener('transitionend', () => {
        modalElement.style.display = 'none';
    }, { once: true });
}

export function showConfirmationModal(text, onConfirm) {
    ui.confirmText.textContent = text;

    const oldBtn = ui.confirmYesBtn;
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    ui.confirmYesBtn = newBtn;

    ui.confirmYesBtn.onclick = () => {
        if (onConfirm) onConfirm();
        closeAnimatedModal(ui.confirmModal);
    };
    openAnimatedModal(ui.confirmModal);
}

export function openChangePasswordModal() {
    const modalTitle = 'Change Your Password';
    const formHtml = `
        <form id="change-password-form" class="space-y-4">
            <div>
                <label for="currentPassword" class="block text-sm font-medium text-slate-300">Current Password</label>
                <input type="password" id="currentPassword" name="currentPassword" required 
                       class="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label for="newPassword" class="block text-sm font-medium text-slate-300">New Password</label>
                <input type="password" id="newPassword" name="newPassword" required
                       class="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label for="confirmPassword" class="block text-sm font-medium text-slate-300">Confirm New Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required
                       class="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="pt-4 flex justify-end">
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Update Password</button>
            </div>
        </form>
    `;

    ui.modalTitle.textContent = modalTitle;
    ui.modalBody.innerHTML = formHtml;

    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = e.target.currentPassword.value;
        const newPassword = e.target.newPassword.value;
        const confirmPassword = e.target.confirmPassword.value;

        if (newPassword.length < 4) { showToast('New password must be at least 4 characters long.', 'error'); return; }
        if (newPassword !== confirmPassword) { showToast('New passwords do not match.', 'error'); return; }
        if (newPassword === currentPassword) { showToast('New password cannot be the same as the old one.', 'error'); return; }

        // Local check using existing apiService (no network)
        const storedPassword = apiService.users[currentUser.username]?.password;
        if (storedPassword !== undefined && currentPassword !== storedPassword) { 
            showToast('Incorrect current password.', 'error'); 
            return; 
        }

        apiService.users[currentUser.username].password = newPassword;
        await apiService.save();

        showToast('Password updated successfully!', 'success');
        closeAnimatedModal(ui.modal);
    });

    openAnimatedModal(ui.modal);
}

export function showToast(message, type = 'success') {
    const iconMap = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${iconMap[type]} text-xl"></i><span>${message}</span>`;
    ui.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
}

export function openFormModal(title, formFields, onSubmit, initialData = {}, onDeleteItem = null) {
    const config = window.currentPageConfig || {};
    const isEditing = Object.keys(initialData).length > 0;
    let newProfileImageData = null;

    // This check determines if the two-column profile view should be used.
    const isProfileModal = ['student', 'teacher', 'staff'].some(keyword => title.toLowerCase().includes(keyword));

    let profileActionsHtml = '';
    let formContainerClasses = 'col-span-1';

    if (isProfileModal) {
        formContainerClasses = 'md:col-span-2';
        let avatarSrc, profileName, subtitleHtml, actionButtonsHtml = '';

        if (isEditing) {
            avatarSrc = initialData.profileImage || generateInitialsAvatar(initialData.name);
            profileName = initialData.name;

            // --- START OF MODIFICATION 1: Add specific logic for Staff subtitle ---
            if (config.collectionName === 'students') {
                subtitleHtml = `<p class="text-slate-400 text-sm">Roll: ${initialData.rollNo || 'N/A'}</p>`;
            } else if (config.collectionName === 'teachers') {
                subtitleHtml = `<p class="text-blue-400 font-medium">${initialData.subject || 'Teacher'}</p><p class="text-xs text-slate-500">${initialData.email || 'N/A'}</p>`;
            } else if (config.collectionName === 'staffs') { // THIS IS THE NEW LOGIC
                // This displays the job title under the name, matching your desired layout.
                subtitleHtml = `<p class="text-slate-400">${initialData.jobTitle || 'Staff'}</p>`;
            }
            // --- END OF MODIFICATION 1 ---

            if (onDeleteItem) {
                // --- START OF MODIFICATION 2: Customize the delete button text ---
                let deleteButtonText = `Delete ${config.title || 'Item'}`;
                if (config.collectionName === 'staffs') {
                    deleteButtonText = 'Delete Staff'; // This provides the exact text from your screenshot.
                }
                // --- END OF MODIFICATION 2 ---

                actionButtonsHtml = `
                    <div class="space-y-2 pt-4 border-t border-slate-700">
                        <button type="button" id="modal-delete-btn" class="w-full text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2">
                            <i class="fas fa-trash-alt"></i> ${deleteButtonText}
                        </button>
                    </div>`;
            }
        } else {
            avatarSrc = generateInitialsAvatar('?');
            profileName = `New ${config.title || 'Profile'}`;
            subtitleHtml = `<p class="text-slate-400 text-sm">Fill in the details to create a profile.</p>`;
        }

        profileActionsHtml = `
            <div class="md:col-span-1 space-y-4 text-center p-4 bg-slate-900/50 rounded-lg">
                <div class="relative group w-24 h-24 mx-auto">
                    <label for="modal-image-upload" class="cursor-pointer">
                        <img id="modal-img-preview" src="${avatarSrc}" alt="Profile Picture" class="w-24 h-24 rounded-full object-cover border-4 border-slate-700 shadow-lg">
                        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <i class="fas fa-camera text-xl text-white"></i>
                        </div>
                    </label>
                    <input type="file" id="modal-image-upload" accept="image/*" class="hidden">
                </div>
                <div>
                    <p class="font-bold text-xl text-white">${profileName}</p>
                    ${subtitleHtml}
                </div>
                ${actionButtonsHtml}
            </div>
        `;
    }

    const createFieldHtml = (field, data) => {
        let value = data[field.name] || field.value || '';
        if (field.type === 'date' && typeof value === 'string' && value.includes('T')) {
            value = value.slice(0, 10);
        }

        const idAttribute = field.id ? `id="${field.id}"` : `id="${field.name}"`;
        const labelHtml = `<label for="${field.name}" class="block text-sm font-medium text-slate-300">${field.label}</label>`;
        const inputClasses = "mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
        if (field.type === 'textarea') return `<div>${labelHtml}<textarea ${idAttribute} name="${field.name}" rows="3" ${field.required ? 'required' : ''} class="${inputClasses}">${value}</textarea></div>`;
        if (field.type === 'select') return `<div>${labelHtml}<select ${idAttribute} name="${field.name}" ${field.required ? 'required' : ''} ${field.disabled ? 'disabled' : ''} class="${inputClasses}">${field.options}</select></div>`;
        return `<div>${labelHtml}<input type="${field.type}" ${idAttribute} name="${field.name}" value="${value}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" class="${inputClasses}"></div>`;
    };

    const standardFieldsHtml = formFields.map(field => createFieldHtml(field, initialData)).join('');

    const formHtml = `
        <form id="modal-form" class="space-y-4">
            <div class="grid grid-cols-1 ${isProfileModal ? 'md:grid-cols-3' : ''} gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                ${profileActionsHtml}
                <div class="${formContainerClasses}">
                    <div class="space-y-4">${standardFieldsHtml}</div>
                </div>
            </div>
            <div class="flex justify-end pt-4 border-t border-slate-600">
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Save Changes</button>
            </div>
        </form>
    `;

    ui.modalTitle.textContent = title;
    ui.modalBody.innerHTML = formHtml;

    formFields.forEach(field => {
        const el = document.getElementById(field.id || field.name);
        if (el && field.type === 'select' && initialData[field.name]) {
            el.value = initialData[field.name];
        }
    });

    if (isProfileModal) {
        document.getElementById('modal-image-upload').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    newProfileImageData = e.target.result;
                    document.getElementById('modal-img-preview').src = newProfileImageData;
                };
                reader.readAsDataURL(file);
            }
        });

        const deleteBtn = document.getElementById('modal-delete-btn');
        if (deleteBtn && onDeleteItem) {
            deleteBtn.onclick = () => onDeleteItem(initialData.id);
        }
    }

    document.getElementById('modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = Object.fromEntries(new FormData(e.target));
        if (newProfileImageData) {
            formData.profileImage = newProfileImageData;
        }
        await onSubmit(formData);
        closeAnimatedModal(ui.modal);
    });

    const modalContent = ui.modal.querySelector('.modal-content');
    if (isProfileModal) {
        modalContent.classList.add('!max-w-4xl');
    } else {
        modalContent.classList.remove('!max-w-4xl');
    }

    openAnimatedModal(ui.modal);
    ui.modal.addEventListener('transitionend', () => {
        if (!ui.modal.classList.contains('show')) {
            modalContent.classList.remove('!max-w-4xl');
        }
    }, { once: true });
}

export function exportToCsv(filename, headers, rows) {
    const sanitizeCell = (cell) => {
        let strCell = String(cell === null || cell === undefined ? '' : cell);
        if (strCell.search(/("|,|\n)/g) >= 0) {
            strCell = `"${strCell.replace(/"/g, '""')}"`;
        }
        return strCell;
    };

    const sanitizedRows = rows.map(row => row.map(sanitizeCell));
    let csvContent = "data:text/csv;charset=utf-8,"
        + headers.join(",") + "\n"
        + sanitizedRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Report ${filename} downloaded.`, 'success');
}