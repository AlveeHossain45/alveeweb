// in frontend/src/pages/profile.js

import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { showToast } from '../utils/helpers.js';
import { generateInitialsAvatar, openChangePasswordModal, openFormModal } from '../utils/helpers.js';

export async function renderProfilePage() {
    let profileData = { ...currentUser };

    const formatDate = (dateString) => {
        if (!dateString) return null;
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const createDetailItem = (icon, label, value) => `
        <div class="flex items-start gap-4 p-3 transition-all duration-300 rounded-xl hover:bg-gradient-to-r from-blue-900/20 to-transparent group">
            <div class="flex-shrink-0 bg-gradient-to-br from-blue-600 to-blue-800 h-12 w-12 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-blue-500/30 transition-all duration-300">
                <i class="fas ${icon} text-white text-lg"></i>
            </div>
            <div class="flex-grow">
                <p class="font-medium text-blue-400/80 text-sm mb-1">${label}</p>
                <p class="text-white text-lg font-medium">${value || '<span class="text-slate-400">Not set</span>'}</p>
            </div>
        </div>`;

    let contactInfoHtml = '';
    let roleSpecificInfoHtml = '';

    if (currentUser.role === 'Student') {
        const studentDetails = store.getMap('students').get(currentUser.studentId);
        if (studentDetails) profileData = { ...profileData, ...studentDetails };
        let departmentName = '<span class="text-yellow-400">N/A</span>';
        let sectionName = '<span class="text-yellow-400">N/A</span>';
        if (profileData.sectionId) {
            departmentName = profileData.sectionId.subjectId?.departmentId?.name || departmentName;
            sectionName = profileData.sectionId.name || sectionName;
        }
        contactInfoHtml = `${createDetailItem('fa-envelope', 'Email Address', profileData.email)}${createDetailItem('fa-phone-alt', 'Guardian Contact', profileData.contact)}${createDetailItem('fa-map-marker-alt', 'Address', profileData.address)}`;
        roleSpecificInfoHtml = `${createDetailItem('fa-id-card', 'Roll Number', profileData.rollNo)}${createDetailItem('fa-building', 'Department', departmentName)}${createDetailItem('fa-school', 'Section', sectionName)}${createDetailItem('fa-user-shield', 'Guardian Name', profileData.guardianName)}${createDetailItem('fa-birthday-cake', 'Date of Birth', formatDate(profileData.dateOfBirth))}`;
    } else if (currentUser.role === 'Teacher') {
        const teacherDetails = store.getMap('teachers').get(currentUser.teacherId);
        if (teacherDetails) profileData = { ...profileData, ...teacherDetails };
        const myDept = store.getMap('departments').get(profileData.departmentId)?.name || 'N/A';
        contactInfoHtml = `${createDetailItem('fa-envelope', 'Email Address', profileData.email)}${createDetailItem('fa-phone-alt', 'Contact Number', profileData.contact)}${createDetailItem('fa-home', 'Address', profileData.address)}`;
        roleSpecificInfoHtml = `${createDetailItem('fa-building', 'Department', myDept)}${createDetailItem('fa-graduation-cap', 'Qualifications', profileData.qualifications)}${createDetailItem('fa-calendar-check', 'Joining Date', formatDate(profileData.joiningDate))}`;
    } else { // For Admin, Accountant, Librarian, Staff
        const staffDetails = store.get('staffs').find(s => s.email === currentUser.email);
        if (staffDetails) profileData = { ...profileData, ...staffDetails };
        contactInfoHtml = `${createDetailItem('fa-envelope', 'Email Address', profileData.email)}${createDetailItem('fa-user-tie', 'Role', profileData.role)}`;
        roleSpecificInfoHtml = `${createDetailItem('fa-phone-alt', 'Contact', profileData.contact || 'N/A')}${createDetailItem('fa-calendar-check', 'Joining Date', formatDate(profileData.joiningDate))}`;
    }

    const profileHtml = `<div class="max-w-5xl mx-auto space-y-8 animate-fade-in"><div class="relative bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 p-6 rounded-3xl shadow-2xl overflow-hidden"><div class="absolute inset-0 bg-[url('https://assets.codepen.io/13471/sparkles.gif')] opacity-5"></div><div class="relative flex flex-col sm:flex-row items-center gap-8 z-10"><div class="flex-shrink-0 text-center relative group">
        <img id="profile-img-preview" 
             src="${profileData.profileImage || generateInitialsAvatar(profileData.name)}" 
             alt="Profile Picture" 
             class="w-32 h-32 rounded-2xl object-cover border-4 border-blue-500/30 shadow-xl transition-all duration-500 group-hover:border-blue-400 group-hover:scale-105">
        <label for="profile-image-upload" class="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div class="text-center p-2"><i class="fas fa-camera text-2xl text-white mb-1"></i><p class="text-xs text-white font-medium">Change Photo</p></div></label><input type="file" id="profile-image-upload" accept="image/*" class="hidden"></div><div class="flex-grow text-center sm:text-left"><h1 class="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">${profileData.name}</h1><div class="inline-block mt-2 px-4 py-1 bg-blue-900/30 rounded-full border border-blue-700/50 text-blue-300 text-sm font-medium">${profileData.role}</div>${profileData.bio ? `<p class="mt-3 text-slate-300 max-w-lg">${profileData.bio}</p>` : ''}</div><div class="flex-shrink-0 flex flex-col gap-3 w-full sm:w-auto"><button id="edit-profile-btn" class="relative overflow-hidden w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2"><span class="relative z-10"><i class="fas fa-edit"></i> Edit Profile</span></button><button id="change-password-btn" class="relative overflow-hidden w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-slate-500/20 flex items-center justify-center gap-2"><span class="relative z-10"><i class="fas fa-key"></i> Change Password</span></button></div></div></div><div class="grid grid-cols-1 lg:grid-cols-2 gap-6"><div class="relative bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 p-6 rounded-3xl shadow-xl overflow-hidden"><div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent"></div><h3 class="text-xl font-bold text-white mb-5 flex items-center gap-2"><i class="fas fa-address-card text-blue-400"></i><span>Contact Information</span></h3><div class="space-y-4">${contactInfoHtml}</div></div><div class="relative bg-gradient-to-br from-slate-800/80 to-slate-900/90 backdrop-blur-sm border border-slate-700/50 p-6 rounded-3xl shadow-xl overflow-hidden"><div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent"></div><h3 class="text-xl font-bold text-white mb-5 flex items-center gap-2"><i class="fas ${currentUser.role === 'Student' ? 'fa-graduation-cap' : currentUser.role === 'Teacher' ? 'fa-chalkboard-teacher' : 'fa-cog'} text-blue-400"></i><span>${currentUser.role === 'Student' ? 'Academic Details' : (currentUser.role === 'Teacher' ? 'Professional Information' : 'System Information')}</span></h3><div class="space-y-4">${roleSpecificInfoHtml}</div></div></div><div class="text-center text-slate-500 text-sm mt-8"><p>Member since ${new Date(currentUser.createdAt || Date.now()).toLocaleDateString()}</p></div></div>`;
    ui.contentArea.innerHTML = profileHtml;

    document.getElementById('profile-image-upload').addEventListener('change', async function(event) {
        const file = event.target.files[0];
        if (!file) return;

        let fileToUpload = file;
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

        // Show a loading state on the image
        const previewImage = document.getElementById('profile-img-preview');
        const originalSrc = previewImage.src;
        previewImage.style.filter = 'blur(3px) brightness(0.7)';

        try {
            if (isHeic) {
                showToast("Converting HEIC image...", "info");
                // Convert HEIC to JPEG Blob
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.8,
                });
                fileToUpload = convertedBlob;
            }

            const formData = new FormData();
            // Append the correct file (original or converted)
            // If it was a Blob, we must provide a filename.
            formData.append('profileImage', fileToUpload, isHeic ? 'converted.jpeg' : file.name);

            let collection = null, id = null;
            if (currentUser.role === 'Student') { collection = 'students'; id = currentUser.studentId; }
            else if (currentUser.role === 'Teacher') { collection = 'teachers'; id = currentUser.teacherId; }
            else { 
                const user = store.get('users').find(u => u.id === currentUser.id);
                if (user?.staffId) { collection = 'staffs'; id = user.staffId; }
            }

            if (collection && id) {
                const updatedProfile = await apiService.update(collection, id, formData);
                if (updatedProfile) {
                    currentUser.profileImage = updatedProfile.profileImage;
                    ui.headerUserAvatar.src = updatedProfile.profileImage;
                    sessionStorage.setItem('sms_user_pro', JSON.stringify(currentUser));
                    
                    // Update the preview with the final URL from the server
                    previewImage.src = updatedProfile.profileImage;
                    showToast('Profile image updated successfully!', 'success');
                }
            } else {
                 showToast('Could not determine profile type to update.', 'error');
            }
        } catch (error) {
            console.error("Image upload/conversion failed:", error);
            showToast("Failed to process image.", "error");
            previewImage.src = originalSrc; // Revert to original image on failure
        } finally {
            // Always remove the loading state
            previewImage.style.filter = 'none';
        }
    });


    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.onclick = () => {
            let idToUpdate, currentDetails, formFields, collection;

            if (currentUser.role === 'Student') {
                collection = 'students';
                idToUpdate = currentUser.studentId;
                currentDetails = store.getMap('students').get(idToUpdate);
                formFields = [ { name: 'name', label: 'Full Name', type: 'text', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'contact', label: 'Contact Number', type: 'tel', required: true }, { name: 'address', label: 'Address', type: 'textarea' }, { name: 'guardianName', label: 'Guardian Name', type: 'text', required: true }, { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' }];
            } else if (currentUser.role === 'Teacher') {
                collection = 'teachers';
                idToUpdate = currentUser.teacherId;
                currentDetails = store.getMap('teachers').get(idToUpdate);
                formFields = [ { name: 'name', label: 'Full Name', type: 'text', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'contact', label: 'Contact Number', type: 'tel', required: true }, { name: 'address', label: 'Address', type: 'textarea' }, { name: 'qualifications', label: 'Qualifications', type: 'text' }, { name: 'bio', label: 'Bio', type: 'textarea' }];
            } else {
                collection = 'staffs';
                const user = store.get('users').find(u => u.id === currentUser.id);
                idToUpdate = user?.staffId;
                currentDetails = store.get('staffs').find(s => s.id === idToUpdate);
                formFields = [ { name: 'name', label: 'Full Name', type: 'text', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'contact', label: 'Contact Number', type: 'tel', required: true }, { name: 'address', label: 'Address', type: 'textarea' } ];
            }

            if (!idToUpdate) {
                showToast('Profile details not found for editing.', 'error');
                return;
            }

            openFormModal('Edit Your Profile', formFields, async (formData) => {
                const updatedProfile = await apiService.update(collection, idToUpdate, formData);
                if (updatedProfile) {
                    await store.refresh(collection);
                    const savedUser = JSON.parse(sessionStorage.getItem('sms_user_pro'));
                    const updatedUserData = Object.fromEntries(formData.entries());
                    currentUser = {...savedUser, ...updatedUserData};
                    sessionStorage.setItem('sms_user_pro', JSON.stringify(currentUser));
                    showToast('Profile updated successfully!', 'success');
                    renderProfilePage(); // Re-render to show changes
                }
            }, currentDetails);
        };
    }
    document.getElementById('change-password-btn').onclick = openChangePasswordModal;
}