// in frontend/src/pages/transport.js

import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { renderGenericListPage } from '../utils/genericListPage.js';
// --- THIS IS THE FIX: Added the missing helper functions ---
import { openFormModal, showConfirmationModal, showToast } from '../utils/helpers.js';

export async function renderTransportPage() {
    // ... rest of the file is correct
    // ১. সার্ভার থেকে ট্রান্সপোর্টের সর্বশেষ ডেটা আনা হচ্ছে
    await store.refresh('transport');
    const allRoutes = store.get('transport');

    // ২. জেনেরিক লিস্ট পেজ রেন্ডারারের জন্য কনফিগারেশন তৈরি করা
    const transportConfig = {
        title: 'Bus Route',
        collectionName: 'transport',
        data: allRoutes,
        searchKeys: ['routeName', 'vehicleNumber', 'driverName'],
        columns: [
            { label: 'Route Name', key: 'routeName', sortable: true },
            { label: 'Vehicle No.', key: 'vehicleNumber' },
            { label: 'Driver', render: item => `${item.driverName} <br><span class="text-xs text-slate-400">${item.driverContact || ''}</span>` },
            { label: 'Start Time', key: 'startTime', sortable: true },
            { label: 'Stops', render: item => item.stops.join(', ') },
        ],
        // ৩. নতুন রুট যোগ বা এডিট করার জন্য ফর্মের ফিল্ডগুলো নির্ধারণ করা
        formFields: [
            { name: 'routeName', label: 'Route Name (e.g., Downtown Express)', type: 'text', required: true },
            { name: 'vehicleNumber', label: 'Vehicle Number (e.g., DH-1234)', type: 'text', required: true },
            { name: 'startTime', label: 'Start Time (e.g., 07:00 AM)', type: 'text', required: true },
            { name: 'driverName', label: 'Driver Name', type: 'text', required: true },
            { name: 'driverContact', label: 'Driver Contact', type: 'tel' },
            { name: 'capacity', label: 'Vehicle Capacity', type: 'number', required: true },
            { name: 'stops', label: 'Stops (comma-separated)', type: 'textarea', placeholder: 'e.g., Stop A, Stop B, Stop C' },
        ],
        // ৪. এডিট এবং ডিলিট বাটন কার্যকর করার জন্য কাস্টম লিসেনার
        customListeners: (items) => {
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.onclick = () => {
                    const itemId = btn.dataset.id;
                    const item = items.find(i => i.id === itemId);
                    if (item) {
                        // Stops অ্যারে-কে কমা-সেপারেটেড স্ট্রিং-এ পরিণত করে ফর্মে দেখানো হচ্ছে
                        const itemForForm = { ...item, stops: item.stops.join(', ') };

                        openFormModal(`Edit Bus Route`, transportConfig.formFields, async (formData) => {
                            // কমা-সেপারেটেড স্ট্রিং-কে আবার অ্যারে-তে পরিণত করে সার্ভারে পাঠানো হচ্ছে
                            formData.stops = formData.stops.split(',').map(s => s.trim()).filter(s => s);
                            if (await apiService.update('transport', item.id, formData)) {
                                showToast('Route updated successfully!', 'success');
                                renderTransportPage(); // পেজটি রিফ্রেশ করা
                            }
                        }, itemForForm);
                    }
                };
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = () => {
                    const itemId = btn.dataset.id;
                    const item = items.find(i => i.id === itemId);
                    showConfirmationModal(`Are you sure you want to delete the route "${item.routeName}"?`, async () => {
                        if (await apiService.remove('transport', itemId)) {
                            showToast('Route deleted successfully.', 'success');
                            renderTransportPage(); // পেজটি রিফ্রেশ করা
                        }
                    });
                };
            });
        },
        // ৫. নতুন রুট যোগ করার সময় 'stops' অ্যারে সঠিকভাবে হ্যান্ডেল করার জন্য কাস্টম ফাংশন
        customAddFunction: () => {
            openFormModal(`Add New Bus Route`, transportConfig.formFields, async (formData) => {
                // কমা-সেপারেটেড স্টপস-কে অ্যারে-তে রূপান্তর করে পাঠানো হচ্ছে
                formData.stops = formData.stops.split(',').map(s => s.trim()).filter(s => s);
                if (await apiService.create('transport', formData)) {
                    showToast('New route added successfully!', 'success');
                    renderTransportPage();
                }
            });
        }
    };

    // ম্যানুয়ালি 'Actions' কলামটি যোগ করা হচ্ছে
    transportConfig.columns.push({
        label: 'Actions',
        render: (item) => `
            <div class="flex items-center gap-4">
                <button class="text-blue-400 hover:text-blue-300 edit-btn" data-id="${item.id}" title="Edit Route"><i class="fas fa-edit"></i></button>
                <button class="text-red-500 hover:text-red-400 delete-btn" data-id="${item.id}" title="Delete Route"><i class="fas fa-trash-alt"></i></button>
            </div>
        `
    });

    // ৬. renderGenericListPage ফাংশন ব্যবহার করে পুরো পেজটি তৈরি করা
    renderGenericListPage({ ...transportConfig, hideActions: true, preventDefaultEdit: true });
}