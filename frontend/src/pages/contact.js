// in frontend/src/pages/contact.js

import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui, updateSidebarNotifications } from '../ui.js';
import { generateInitialsAvatar, handleVoiceRecording, showImageViewer } from '../utils/helpers.js';

export async function renderContactTeacherPage() {
    // --- 1. CLEAR NOTIFICATIONS FOR CURRENT USER ---
    const notifications = JSON.parse(sessionStorage.getItem('sms_chat_notifications')) || {};
    if (notifications[currentUser.id]) {
        delete notifications[currentUser.id];
        sessionStorage.setItem('sms_chat_notifications', JSON.stringify(notifications));
        updateSidebarNotifications(); // Update UI immediately
    }

    // --- 2. DATA FETCHING & PREPARATION ---
    const myClass = store.get('classes').find(c => c.id === currentUser.classId);
    const classTeacher = myClass ? store.getMap('teachers').get(myClass.teacherId) : null;

    if (!classTeacher) {
        ui.contentArea.innerHTML = `<p class="text-red-400 text-center p-8">Your class teacher information is not available.</p>`;
        return;
    }

    // --- 3. RENDER THE UNIFIED CHAT INTERFACE ---
    // This is the crucial fix: It now calls the same powerful function as the teacher's page.
    renderChatInterface(classTeacher, 'teacher');
}

export async function renderContactStudentPage() {
    // --- 1. CLEAR NOTIFICATIONS FOR CURRENT USER ---
    const notifications = JSON.parse(sessionStorage.getItem('sms_chat_notifications')) || {};
    if (notifications[currentUser.id]) {
        delete notifications[currentUser.id];
        sessionStorage.setItem('sms_chat_notifications', JSON.stringify(notifications));
        updateSidebarNotifications(); // Update UI immediately
    }

    // --- 2. GET STUDENTS AND SORT BY LAST MESSAGE ---
    const allNotices = store.get('notices');
    let myStudents = store.get('students').filter(student => {
        const studentClasses = store.get('classes').filter(c => c.teacherId === currentUser.id);
        const subjectClasses = store.get('timetable').filter(t => t.teacherId === currentUser.id);
        const allMyClassIds = [...new Set([...studentClasses.map(c => c.id), ...subjectClasses.map(t => t.classId)])];
        return allMyClassIds.includes(student.classId);
    });

    // Augment students with the timestamp of their last message
    const sortedStudents = myStudents.map(student => {
        const conversation = allNotices.filter(msg =>
            msg.type === 'private_message' &&
            ((msg.authorId === currentUser.id && msg.target === student.id) ||
             (msg.authorId === student.id && msg.target === currentUser.id))
        );
        const lastMessageTimestamp = conversation.length > 0
            ? new Date(conversation[conversation.length - 1].date).getTime()
            : 0;
        return { ...student, lastMessageTimestamp };
    }).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp); // Sort descending

    // --- 3. RENDER THE PAGE LAYOUT ---
    ui.contentArea.innerHTML = `
        <div class="animate-fade-in grid grid-cols-1 lg:grid-cols-3 gap-6" style="height: calc(100vh - 120px);">
            <!-- Student List Column -->
            <div class="lg:col-span-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col">
                <h3 class="text-lg font-semibold mb-4 text-white flex-shrink-0">My Students</h3>
                <div id="student-list-for-chat" class="space-y-2 overflow-y-auto custom-scrollbar">
                    ${sortedStudents.map(student => `
                        <div class="student-chat-item flex items-center p-3 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors" data-studentid="${student.id}">
                            <img src="${student.profileImage || generateInitialsAvatar(student.name)}" class="w-10 h-10 rounded-full object-cover mr-3">
                            <div>
                                <p class="font-semibold text-white">${student.name}</p>
                                <p class="text-xs text-slate-400">Roll: ${student.rollNo}</p>
                            </div>
                        </div>
                    `).join('')}
                    ${myStudents.length === 0 ? `<p class="text-center text-slate-500 italic py-4">You are not assigned to any students.</p>` : ''}
                </div>
            </div>
            <!-- Chat Window Column (Placeholder) -->
            <div id="chat-window-container" class="lg:col-span-2 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-2xl flex flex-col">
                 <div class="flex-grow flex items-center justify-center">
                    <div class="text-center text-slate-500">
                        <i class="fas fa-comments fa-3x"></i>
                        <p class="mt-4">Select a student to start a conversation.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- 4. ADD EVENT LISTENERS ---
    document.querySelectorAll('.student-chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const studentId = e.currentTarget.dataset.studentid;
            const student = myStudents.find(s => s.id === studentId);
            document.querySelectorAll('.student-chat-item').forEach(el => el.classList.remove('active-chat'));
            e.currentTarget.classList.add('active-chat');
            renderChatInterface(student, 'student');
        });
    });
}

export function renderChatInterface(recipient, recipientRole) {
    const chatContainerId = (currentUser.role === 'Student') ? 'content-area' : 'chat-window-container';
    const chatContainer = document.getElementById(chatContainerId);

    if (!chatContainer) return;

    if (currentUser.role === 'Student') {
        ui.contentArea.innerHTML = ''; // Clear the content area first
        chatContainer.classList.add('max-w-4xl', 'mx-auto');
    }

    // 1. Filter notices to get private messages for this specific conversation
    const conversationHistory = store.get('notices').filter(msg =>
        msg.type === 'private_message' &&
        ((msg.authorId === currentUser.id && msg.target === recipient.id) ||
         (msg.authorId === recipient.id && msg.target === currentUser.id))
    ).sort((a, b) => new Date(a.date) - new Date(b.date));

    // 2. Render the main chat UI
    chatContainer.innerHTML = `
        <div class="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-2xl flex flex-col" style="height: ${currentUser.role === 'Student' ? '75vh' : '100%'}">
            <!-- Header -->
            <div class="flex items-center p-4 border-b border-slate-700 flex-shrink-0">
                <img src="${recipient.profileImage || generateInitialsAvatar(recipient.name)}" alt="${recipient.name}" class="w-12 h-12 rounded-full object-cover">
                <div class="ml-4">
                    <h3 class="text-lg font-bold text-white">${recipient.name}</h3>
                    <p class="text-xs text-green-400 capitalize flex items-center"><span class="w-2 h-2 bg-green-400 rounded-full mr-2"></span>${recipientRole}</p>
                </div>
            </div>

            <!-- Chat Body -->
            <div id="chat-body" class="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <!-- Messages will be rendered here -->
            </div>

            <!-- Enhanced Footer/Input -->
            <div class="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-2xl flex-shrink-0">
                <form id="chat-form" class="flex items-end gap-3">
                     <div id="attachment-buttons" class="flex gap-2 self-center">
                        <label for="image-upload" class="chat-tool-btn">
                            <i class="fas fa-paperclip"></i>
                            <input type="file" id="image-upload" accept="image/*" class="hidden">
                        </label>
                        <button type="button" id="voice-record-btn" class="chat-tool-btn">
                            <i class="fas fa-microphone"></i>
                        </button>
                    </div>
                    <textarea id="message-body" placeholder="Type a message..." rows="1" class="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400 rounded-xl py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"></textarea>
                    <button type="submit" id="send-btn" class="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center self-center transform transition-transform hover:scale-110">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    `;
    
    // 3. Render the messages into the chat body
    const chatBody = document.getElementById('chat-body');
    if (conversationHistory.length === 0) {
        chatBody.innerHTML = `<p class="text-slate-500 text-center text-sm">This is the beginning of your conversation with ${recipient.name}.</p>`;
    } else {
        conversationHistory.forEach(msg => {
            const isSentByMe = msg.authorId === currentUser.id;
            const messageElement = document.createElement('div');
            messageElement.className = `flex items-end gap-3 ${isSentByMe ? 'justify-end' : 'justify-start'}`;
            
            let messageContentHtml = '';
            // Switch based on message type
            switch(msg.messageType) {
                case 'image':
                    messageContentHtml = `<img src="${msg.content}" class="max-w-xs rounded-lg cursor-pointer" onclick="showImageViewer('${msg.content}')">`;
                    break;
                case 'audio':
                    messageContentHtml = `<audio controls src="${msg.content}" class="w-64"></audio>`;
                    break;
                default: // 'text'
                    messageContentHtml = `<p class="text-sm whitespace-pre-wrap">${msg.content}</p>`;
            }

            messageElement.innerHTML = `
                ${!isSentByMe ? `<img src="${recipient.profileImage || generateInitialsAvatar(recipient.name)}" alt="R" class="w-8 h-8 rounded-full object-cover flex-shrink-0">` : ''}
                <div class="max-w-xs md:max-w-md p-3 rounded-2xl ${isSentByMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}">
                    ${messageContentHtml}
                    <p class="text-xs opacity-60 mt-1 text-right">${new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
            `;
            chatBody.appendChild(messageElement);
        });
    }
    chatBody.scrollTop = chatBody.scrollHeight;

    // 4. Attach event listeners for the new features
    const messageInput = document.getElementById('message-body');
    const imageInput = document.getElementById('image-upload');
    const voiceRecordBtn = document.getElementById('voice-record-btn');
    const chatForm = document.getElementById('chat-form');

    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = (messageInput.scrollHeight) + 'px';
    });
    
  const sendMessage = async (content, type) => {
    chatForm.querySelector('button[type="submit"]').disabled = true;
    chatForm.querySelector('button[type="submit"]').innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

    const notifications = JSON.parse(sessionStorage.getItem('sms_chat_notifications')) || {};
    notifications[recipient.id] = true; // Mark that the recipient has a new message
    sessionStorage.setItem('sms_chat_notifications', JSON.stringify(notifications));

    await apiService.create('notices', {
        title: `Message from ${currentUser.role}`,
        content: content,
        date: new Date().toISOString(),
        target: recipient.id,
        authorId: currentUser.id,
        type: 'private_message',
        messageType: type
    });

    await store.refresh('notices');
    renderChatInterface(recipient, recipientRole);
    updateSidebarNotifications(); // Update the sender's UI just in case
};

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (text) sendMessage(text, 'text');
    });

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            sendMessage(event.target.result, 'image');
        };
        reader.readAsDataURL(file);
    });

    voiceRecordBtn.addEventListener('click', () => handleVoiceRecording(sendMessage));
}