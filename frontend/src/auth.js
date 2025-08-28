// src/auth.js

import { ui, currentUser, setCurrentUser } from './ui.js';
import { showConfirmationModal } from './utils/helpers.js';
import { initializeApp } from './main.js';

const API_BASE_URL = 'https://edusysv1.vercel.app';

/**
 * Hides the main app UI and shows the login page.
 */
export function showLoginPage() {
    ui.loginPage.style.display = 'block';
    ui.app.classList.add('hidden');
}


export async function handleLogin(e) {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const password = e.target.password.value;
    ui.loginMessage.textContent = ''; // Clear any previous error messages

    const loginFormContainer = document.getElementById('login-form-container');
    const loginSuccessMessage = document.getElementById('login-success-message');
    const successUsername = document.getElementById('success-username');
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Signing In...`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, portal: selectedPortal })
        });

        
        const responseText = await response.text();
        const result = responseText ? JSON.parse(responseText) : {};

       
        if (result.success) {
            // --- SUCCESS PATH (No changes here) ---
            setCurrentUser(result.user);
            sessionStorage.setItem('sms_user_pro', JSON.stringify(result.user));

            if (loginFormContainer) loginFormContainer.classList.add('hidden');
            if (loginSuccessMessage && successUsername) {
                successUsername.textContent = result.user.name || result.user.username;
                loginSuccessMessage.classList.remove('hidden');
            }

            setTimeout(() => {
                initializeApp();
            }, 2000); 

        } else {
           
            ui.loginMessage.textContent = result.message || `Server error: ${response.status}`;
            
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Sign In';
            }
        }
    } catch (error) {
        // --- CATCH BLOCK (For network errors, etc.) ---
        console.error("Login request failed:", error);
        ui.loginMessage.textContent = 'A critical error occurred. Check the console.';
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Sign In';
        }
    }
}


export function handleLogout() {
    showConfirmationModal("Are you sure you want to log out?", () => {
        // --- CRITICAL FIX ---
        // Clear the current user data from memory and session storage.
        setCurrentUser(null);
        sessionStorage.removeItem('sms_user_pro');
        // Reload the page to reset the application state and redirect to login.
        window.location.reload();
    });
}