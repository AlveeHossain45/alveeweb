// in frontend/src/apiService.js

import { showToast } from './utils/helpers.js';
import { currentUser } from './ui.js'; // <-- ADD THIS IMPORT


export const apiService = (() => {
    // The base URL for the API.
    const API_BASE_URL = 'https://edusysv1.vercel.app';
    // This Set correctly identifies which collections need the special /financial prefix.
    const financialCollections = new Set(['fees', 'salaries', 'expenses']);
    // This function is the key. It checks the collection name and adds the prefix if needed.
    const getBaseUrlForCollection = (collection) => {
        if (financialCollections.has(collection)) {
            return `${API_BASE_URL}/financial/${collection}`;
        }
        return `${API_BASE_URL}/${collection}`;
    };
    const mapId = (item) => {
        if (item && item._id) item.id = item._id.toString();
        return item;
    };
    const mapIdInArray = (arr) => Array.isArray(arr) ? arr.map(mapId) : [];
    // All functions below now correctly use getBaseUrlForCollection to build their URLs.
    const init = () => Promise.resolve();
    const save = () => Promise.resolve();
    const reset = () => { /* Requires dedicated backend endpoint */ };

    const get = async (collection, subCollection = null) => {
        const baseUrl = getBaseUrlForCollection(collection);
        const url = subCollection ? `${baseUrl}/${subCollection}` : baseUrl;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Throw an error that includes the status for better debugging
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            return Array.isArray(data) ? mapIdInArray(data) : mapId(data);
        } catch (error) {
            console.error(`Failed to GET from ${url}:`, error);
            showToast('Error: Could not fetch data from the server.', 'error');
            
            // ROBUST FIX: Always return an empty array for a failed collection fetch.
            // This prevents the TypeError: .map is not a function.
            return []; 
        }
    };

    const create = async (collection, data, subCollection = null) => {
        const baseUrl = getBaseUrlForCollection(collection);
        const url = subCollection ? `${baseUrl}/${subCollection}` : baseUrl;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return mapId(await response.json());
        } catch (error) {
            console.error(`Failed to CREATE in ${collection}:`, error);
            showToast('Error: Could not save the new item.', 'error');
            return undefined;
        }
    };

    const bulkCreate = async (collection, data) => {
        const url = `${getBaseUrlForCollection(collection)}/bulk`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },              
                body: JSON.stringify(data),
            });
             // 207 Multi-Status is a valid response for bulk operations
            if (!response.ok && response.status !== 207) 
                throw new Error(`Network response was not ok: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to BULK CREATE in ${collection}:`, error);
            showToast('Error: Could not send bulk data to the server.', 'error');
            return { success: false, insertedCount: 0, failedCount: data.length };
        }
    };
    
        const bulkRemove = async (collection, ids) => {
        const url = `${getBaseUrlForCollection(collection)}/bulk`;
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to BULK REMOVE from ${collection}:`, error);
            showToast('Error: Could not delete the selected items.', 'error');
            return { success: false };
        }
    };


const update = async (collection, id, data, subCollection = null) => {
    const baseUrl = getBaseUrlForCollection(collection);
    const url = subCollection ? `${baseUrl}/${subCollection}/${id}` : `${baseUrl}/${id}`;    
    try {       
        const isFormData = data instanceof FormData;
      // 2. We construct the options for our fetch request.
        const fetchOptions = {
            method: 'PUT',
          
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? data : JSON.stringify(data),
        };
        const response = await fetch(url, fetchOptions);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        return mapId(await response.json());
    } catch (error) {
        console.error(`Failed to UPDATE in ${collection}:`, error);
        showToast('Error: Could not update the item.', 'error');
        return undefined;
    }
};

    const remove = async (collection, id, subCollection = null) => {
        const baseUrl = getBaseUrlForCollection(collection);
        const url = subCollection ? `${baseUrl}/${subCollection}/${id}` : `${baseUrl}/${id}`;
        
         try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to REMOVE from ${collection}:`, error);
            showToast('Error: Could not delete the item.', 'error');
            return { success: false };
        }
    };

        const processSalaries = async (data) => {
        const url = `${API_BASE_URL}/financial/salaries/process`; // The correct, specific URL
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Failed to process salaries:', error);
            showToast('Error: Could not process monthly salaries.', 'error');
            return undefined;
        }
    };
    
      const reactToNotice = async (noticeId, reactionType) => {
        const url = `${API_BASE_URL}/notices/${noticeId}/react`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id, // The ID of the currently logged-in user
                    reactionType: reactionType // e.g., 'like' or 'heart'
                }),
            });
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to react to notice ${noticeId}:`, error);
            showToast('Error: Could not process your reaction.', 'error');
            return null;
        }
    };

    
    const getResultsForExam = (examId) => Promise.resolve([]);
    const saveResults = (examId, resultsData) => Promise.resolve({ success: true });

    const getAttendance = async (sectionId, date) => {
        try {
            const response = await fetch(`${API_BASE_URL}/attendance/${sectionId}/${date}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Failed to get attendance sheet:', error);
            return {}; // Return empty map on error
        }
    };
    
    const saveAttendance = async (data) => { // data = { date, sectionId, records, markedBy }
        try {
            const response = await fetch(`${API_BASE_URL}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('Failed to save attendance:', error);
            return { success: false };
        }
    };
    
    // This is a new function for fetching reports
    const getAttendanceReport = async (type, id, params) => { // type: 'student' or 'section'
        const url = new URL(`${API_BASE_URL}/attendance/report/${type}/${id}`);
        if (params) url.search = new URLSearchParams(params).toString(); // for date ranges
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error(`Failed to get ${type} attendance report:`, error);
            return []; // Return empty array on error
        }
    };


    return {
        init, save, get, create, bulkCreate, bulkRemove, getAttendanceReport,
        update, remove, getAttendance, saveAttendance,
        getResultsForExam, saveResults, reset, processSalaries,
        reactToNotice // <-- EXPORT THE NEW FUNCTION
    };
})();
