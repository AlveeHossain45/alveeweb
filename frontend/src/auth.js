// src/auth.js

import { ui, currentUser, setCurrentUser } from './ui.js';
import { showConfirmationModal } from './utils/helpers.js';
import { initializeApp } from './main.js'; // <-- CORRECT: Import from main

// The API base URL to use for the login request.
const API_BASE_URL = 'https://smsv2-liart.vercel.app';

/**
 * Hides the main app UI and shows the login page.
 */
export function showLoginPage() {
    ui.loginPage.style.display = 'block';
    ui.app.classList.add('hidden');
}

/**
 * Handles the login form submission. It uses the Fetch API to send
 * the username and password to the server.
 * @param {Event} e - The form submission event.
 */
export async function handleLogin(e) {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const password = e.target.password.value;
    ui.loginMessage.textContent = ''; // Clear any previous error messages

    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        // First, check if the response is okay at a network level
        if (!response.ok) {
            // This will show "Server error: 500" for a crash or a network issue.
            ui.loginMessage.textContent = `Server error: ${response.status}`;
            console.error("Server responded with an error:", response);
            return;
        }

        // Get the raw text of the response
        const responseText = await response.text();
        
        // Try to parse it, and handle the case where the response body is empty.
        const result = responseText ? JSON.parse(responseText) : {};

        if (result.success) {
            // Set the current user globally and in session storage.
            setCurrentUser(result.user);
            sessionStorage.setItem('sms_user_pro', JSON.stringify(result.user));
            // Initialize the main application after successful login.
            initializeApp();
        } else {
            // Display a specific error message from the server or a default one.
            ui.loginMessage.textContent = result.message || 'Invalid username or password.';
        }
    } catch (error) {
        // Handle any network-related errors, such as the server being down.
        console.error("Login request failed:", error);
        ui.loginMessage.textContent = 'A critical error occurred. Check the console.';
    }
}

/**
 * Handles the logout process. It shows a confirmation modal before
 * clearing user data from the session and reloading the page.
 */
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
