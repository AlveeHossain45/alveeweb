import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { calculateOverdueDays, createDashboardCard, exportToCsv, openFormModal, showConfirmationModal, showToast } from '../utils/helpers.js';

export const renderLibraryPage = async () => {
    // --- 1. DATA FETCHING AND PREPARATION ---
    await Promise.all([
        store.refresh('library', 'books'),
        store.refresh('library', 'transactions'),
        store.refresh('library', 'reservations'),
        store.refresh('library', 'acquisitions'),
        store.refresh('library', 'readingLists'),
        store.refresh('fees'),
        store.refresh('students'),
        store.refresh('teachers'),
        store.refresh('sections') 

    ]);
      const allUsers = store.get('users');
    const memberUsers = allUsers.filter(u => u.role === 'Student' || u.role === 'Teacher');
    // This new memberMap now contains full user objects, each with a .role property.
    const memberMap = new Map(memberUsers.map(u => [u.id, u])); 

    const libraryData = {
        books: store.get('library', 'books'),
        transactions: store.get('library', 'transactions'),
        reservations: store.get('library', 'reservations'),
        readingLists: store.get('library', 'readingLists'),
        acquisitions: store.get('library', 'acquisitions')
    };

    const sectionMap = store.getMap('sections'); 

    const bookMap = new Map(libraryData.books.map(b => [b.bookId, b]));
    const FINE_PER_DAY = 5;

    // --- 2. HELPER & CORE LOGIC FUNCTIONS ---

    const formatDate = (isoDate) => isoDate ? new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    
    const calculateOverdueDays = (dueDate) => {
        const due = new Date(dueDate);
        const today = new Date(); // Use the real current date
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        if (today <= due) return 0;
        return Math.ceil((today - due) / (1000 * 60 * 60 * 24));
    };

    const completeReturn = async (transaction) => {
        await apiService.update('library', transaction.transactionId, { status: 'Returned', returnDate: new Date().toISOString().slice(0, 10) }, 'transactions', 'transactionId');
        const book = bookMap.get(transaction.bookId);
        if (book) {
            await apiService.update('library', book.bookId, { availableCopies: book.availableCopies + 1 }, 'books', 'bookId');
        }
    };

    const handleReturn = async (transactionId) => {
        const transaction = libraryData.transactions.find(t => t.transactionId === transactionId);
        if (!transaction) return;

        const overdueDays = calculateOverdueDays(transaction.dueDate);
        if (overdueDays > 0) {
            const fineAmount = overdueDays * FINE_PER_DAY;
            showConfirmationModal(`This book is ${overdueDays} days overdue. A fine of BDT ${fineAmount} will be added. Proceed?`, async () => {
                await apiService.create('fees', {
                    studentId: transaction.memberId, // Matches original data structure
                    feeType: 'Library Fine',
                    amount: fineAmount,
                    status: 'Unpaid',
                    dueDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().slice(0, 10)
                });
                await completeReturn(transaction);
                showToast(`Fine of BDT ${fineAmount} added.`, 'info');
                renderLibraryPage();
            });
        } else {
            await completeReturn(transaction);
            showToast('Book returned successfully!', 'success');
            renderLibraryPage();
        }
    };
    
    const cancelRequest = async (reservationId) => {
        showConfirmationModal('Are you sure you want to cancel this book request?', async () => {
            await apiService.remove('library', reservationId, 'reservations', 'reservationId');
            showToast('Your book request has been cancelled.', 'success');
            renderLibraryPage();
        });
    };

    const exportToCsv = (filename, headers, rows) => {
       const sanitizeCell = (cell) => {
            let strCell = String(cell === null || cell === undefined ? '' : cell);
            if (strCell.search(/("|,|\n)/g) >= 0) {
                strCell = `"${strCell.replace(/"/g, '""')}"`;
            }
            return strCell;
        };
        const sanitizedRows = rows.map(row => row.map(sanitizeCell));
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + sanitizedRows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Report ${filename} downloaded.`, 'success');
    };

    // --- 3. UI RENDERING ---

    const renderTabs = () => {
        let tabs = [];
        const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Librarian';

        if (isAdmin) {
            tabs = [
                { id: 'lib-dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
                { id: 'catalog', label: 'Book Catalog', icon: 'fa-book' },
                { id: 'transactions', label: 'Transactions', icon: 'fa-exchange-alt' },
                { id: 'reservations', label: 'Reservations', icon: 'fa-clock' },
                { id: 'members', label: 'Members', icon: 'fa-users' },
                { id: 'reports', label: 'Reports', icon: 'fa-file-export' },
            ];
        } else { // Student or Teacher
            tabs = [
                { id: 'catalog', label: 'Search Books', icon: 'fa-search' },
                { id: 'my-books', label: 'My Books & History', icon: 'fa-book-reader' },
                { id: 'reading-lists', label: 'Reading Lists', icon: 'fa-list-ol' },
            ];
        }

        return `
            <div class="flex flex-wrap border-b border-slate-700 mb-6 -mx-4 px-4 custom-scrollbar overflow-x-auto">
                ${tabs.map((tab, index) => `
                    <button class="tab-link flex-shrink-0 py-3 px-4 flex items-center gap-2 font-semibold border-b-2 transition-colors duration-300 ${index === 0 ? 'active text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'}" data-tab="${tab.id}">
                        <i class="fas ${tab.icon}"></i> ${tab.label}
                    </button>
                `).join('')}
            </div>
            ${tabs.map((tab, index) => `<div id="${tab.id}" class="tab-content ${index > 0 ? 'hidden' : ''} animate-fade-in"></div>`).join('')}
        `;
    };

    ui.contentArea.innerHTML = `<div class="bg-slate-800/50 p-4 sm:p-6 rounded-xl border border-slate-700 animate-fade-in">${renderTabs()}</div>`;

    // --- 4. TAB-SPECIFIC RENDERERS ---

const renderLibrarianDashboard = () => {
    // --- 1. (NEW) CALCULATE DATA FOR THE CHART ---
    // We count the occurrences of each genre from the transaction history.
    const recentAcquisitions = libraryData.acquisitions.sort((a, b) => new Date(b.acquiredDate) - new Date(a.acquiredDate)).slice(0, 5);

    const genreCounts = libraryData.transactions.reduce((acc, transaction) => {
        const book = bookMap.get(transaction.bookId);
        if (book && book.genre) {
            acc[book.genre] = (acc[book.genre] || 0) + 1;
        }
        return acc;
    }, {});

    const container = document.getElementById('lib-dashboard');
    const totalBooks = libraryData.books.reduce((sum, book) => sum + book.totalCopies, 0);
    const booksOnLoan = libraryData.transactions.filter(t => t.status === 'Issued').length;
    const overdueBooks = libraryData.transactions.filter(t => t.status === 'Issued' && calculateOverdueDays(t.dueDate) > 0).length;
    const totalMembers = memberMap.size;
    
    const cardData = [
        { title: 'Total Books', value: totalBooks, icon: 'fa-book-journal-whills', color: 'blue' },
        { title: 'Books on Loan', value: booksOnLoan, icon: 'fa-people-arrows', color: 'green' },
        { title: 'Overdue Books', value: overdueBooks, icon: 'fa-exclamation-triangle', color: 'red' },
        { title: 'Total Members', value: totalMembers, icon: 'fa-users', color: 'purple' },
    ];
    
    // --- 2. (UPDATED) ADD HTML FOR THE CHART ---
    container.innerHTML = `
        <h3 class="text-2xl font-bold mb-6 text-white">Library Dashboard</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            ${cardData.map(createDashboardCard).join('')}
        </div>
        <div class="mt-8 bg-slate-800/50 p-6 rounded-xl border border-slate-700">
                <h4 class="text-xl font-semibold mb-4 text-white">Recent Acquisitions</h4>
                <div class="space-y-3">
                    ${recentAcquisitions.length > 0 ? recentAcquisitions.map(acq => `
                        <div class="p-3 bg-slate-800 rounded-lg flex justify-between items-center">
                            <div><p class="font-semibold text-white">${acq.title}</p><p class="text-xs text-slate-400">by ${acq.author}</p></div>
                            <p class="text-sm text-slate-500">${formatDate(acq.acquiredDate)}</p>
                        </div>
                    `).join('') : '<p class="text-slate-500 italic">No recent acquisition records.</p>'}
                </div>
            </div>

        <!-- START: New Chart Section -->
        <div class="mt-8 bg-slate-800/50 p-4 sm:p-6 rounded-xl border border-slate-700">
            <h4 class="text-xl font-semibold mb-4 text-white">Popular Genres (by borrows)</h4>
            <div class="max-w-sm mx-auto">
                 ${Object.keys(genreCounts).length > 0 ? `<canvas id="genreChart"></canvas>`: `<p class="text-center text-slate-500 py-8">No transaction data available to generate genre chart.</p>`}
            </div>
        </div>
    `;

    // --- 3. (NEW) INITIALIZE THE CHART WITH JAVASCRIPT ---
    // This code runs only if there is data to show.
      if (Object.keys(genreCounts).length > 0) {
        const chartCanvas = document.getElementById('genreChart')?.getContext('2d');
        if (chartCanvas) {
            new Chart(chartCanvas, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(genreCounts),
                    datasets: [{
                        label: 'Borrows',
                        data: Object.values(genreCounts),
                        backgroundColor: [ // Colors similar to the image
                            '#4299E1', '#48BB78', '#F56565', '#ED8936', '#9F7AEA',
                            '#ED64A6', '#667EEA', '#38B2AC', '#EF4444', '#FBBF24', '#A78BFA'
                        ],
                        borderColor: '#1E293B', // Background color for spacing
                        borderWidth: 3,
                        hoverOffset: 8
                    }]
                },
                options: { 
                    responsive: true, 
                    plugins: { 
                        legend: { 
                            position: 'right', 
                            labels: { 
                                color: '#CBD5E0', 
                                font: { size: 14 }, 
                                boxWidth: 20, 
                                padding: 15 
                            } 
                        } 
                    }
                }
            });
        }
    }
};


    const renderCatalog = (containerId) => {
        const container = document.getElementById(containerId);
        const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Librarian';
        document.querySelectorAll('.request-btn').forEach(btn => btn.onclick = async (e) => {
            // Improvement: Immediate UI feedback
            e.target.disabled = true;
            e.target.innerHTML = `<i class="fas fa-clock mr-2"></i>Requested`;

            await apiService.create('library', { bookId: e.target.dataset.bookid, /* ... */ }, 'reservations');
            showToast('Book requested!', 'success');
            // No full refresh needed, UI is already updated
        });

        container.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-4 mb-4">
                <input type="text" id="book-search" placeholder="Search by title, author, genre, or ISBN..." class="w-full md:w-1/2 p-2 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 text-white">
                <div class="flex items-center gap-2">
                    ${isAdmin ? `<button id="add-book-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-plus"></i> Add Book</button>` : ''}
                    ${currentUser.role === 'Teacher' ? `<button id="request-acquisition-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-bookmark"></i> Request Acquisition</button>` : ''}
                </div>
            </div>
            <div id="catalog-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"></div>`;

        if (document.getElementById('add-book-btn')) {
            document.getElementById('add-book-btn').onclick = () => openBookForm();
        }
        if (document.getElementById('request-acquisition-btn')) {
            document.getElementById('request-acquisition-btn').onclick = () => {
                openFormModal('Request a New Book for Acquisition', [
                    { name: 'title', label: 'Book Title', type: 'text', required: true },
                    { name: 'author', label: 'Author', type: 'text', required: true },
                    { name: 'reason', label: 'Reason for Request (e.g., for course XYZ)', type: 'textarea', required: true },
                ], async (formData) => {
                    const acquisitionRequest = { ...formData, requesterId: currentUser.id, requesterName: currentUser.name, requestDate: new Date().toISOString().slice(0, 10), status: 'Pending' };
                    await apiService.create('library', acquisitionRequest, 'acquisitions');
                    showToast('Acquisition request submitted successfully!', 'success');
                });
            };
        }

        const openBookForm = (book = {}) => {
            const isEditing = !!book.bookId;
            openFormModal(isEditing ? 'Edit Book' : 'Add New Book', [
                { name: 'title', label: 'Book Title', type: 'text', required: true, value: book.title || '' }, { name: 'author', label: 'Author', type: 'text', required: true, value: book.author || '' }, { name: 'publicationYear', label: 'Publication Year', type: 'number', required: true, value: book.publicationYear || '' }, { name: 'isbn', label: 'ISBN', type: 'text', value: book.isbn || '' }, { name: 'genre', label: 'Genre', type: 'text', required: true, value: book.genre || '' }, { name: 'totalCopies', label: 'Total Copies', type: 'number', required: true, value: book.totalCopies || '' },
            ], async (formData) => {
                if (isEditing) {
                    await apiService.update('library', book.bookId, formData, 'books', 'bookId');
                    showToast('Book updated successfully', 'success');
                } else {
                    formData.availableCopies = parseInt(formData.totalCopies);
                    await apiService.create('library', formData, 'books');
                    showToast('Book added successfully', 'success');
                }
                renderLibraryPage();
            });
        };
        
        const handleAddToList = async (bookId) => {
            const myLists = libraryData.readingLists.filter(l => l.teacherId === currentUser.id);
            if (myLists.length === 0) { showToast('Please create a reading list first from the "Reading Lists" tab.', 'info'); return; }
            openFormModal('Add Book to Reading List', [{ name: 'listId', label: 'Select List', type: 'select', options: myLists.map(l => `<option value="${l.id}">${l.name}</option>`).join(''), required: true }, ], async (formData) => {
                const list = myLists.find(l => l.id === formData.listId);
                if (list && !list.bookIds.includes(bookId)) {
                    list.bookIds.push(bookId); await apiService.update('library', list.id, { bookIds: list.bookIds }, 'readingLists', 'id');
                    showToast('Book added to list!', 'success'); renderReadingLists();
                } else if (list) { showToast('This book is already in the selected list.', 'error'); }
            });
        };

        const renderBookList = (books) => {
            const listContainer = document.getElementById('catalog-list');
            if (books.length === 0) { listContainer.innerHTML = `<div class="col-span-full text-center py-10"><p class="text-slate-500">No books found.</p></div>`; return; }
            listContainer.innerHTML = books.map(book => {
                const isRequestedByCurrentUser = libraryData.reservations.some(r => r.bookId === book.bookId && r.memberId === currentUser.id && r.status === 'Pending');
                return `
                <div class="p-4 border border-slate-700 rounded-lg flex flex-col bg-slate-800/50 hover:border-blue-500 transition-all duration-300 shadow-md">
                    <h4 class="font-bold text-lg text-white">${book.title}</h4>
                    <p class="text-slate-400 text-sm">by ${book.author}</p>
                    <p class="text-xs text-slate-500 mt-1">Genre: ${book.genre} | Pub: ${book.publicationYear}</p>
                    <div class="flex-grow my-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${book.availableCopies > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}">${book.availableCopies > 0 ? `${book.availableCopies} of ${book.totalCopies} Available` : 'Unavailable'}</span></div>
                    <div class="mt-auto pt-3 border-t border-slate-700/50 flex flex-col gap-2">
                        ${!isAdmin ? (book.availableCopies <= 0 ? (isRequestedByCurrentUser ? `<button class="w-full bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg cursor-not-allowed text-sm" disabled><i class="fas fa-clock mr-2"></i>Requested</button>` : `<button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg request-btn text-sm" data-bookid="${book.bookId}"><i class="fas fa-hand-paper mr-2"></i>Request</button>`) : '') : ''}
                        ${isAdmin ? `<button class="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg edit-book-btn text-sm" data-bookid="${book.bookId}"><i class="fas fa-edit mr-2"></i>Edit</button>` : ''}
                        ${currentUser.role === 'Teacher' ? `<button class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-lg add-to-list-btn text-sm mt-2" data-bookid="${book.bookId}"><i class="fas fa-plus mr-2"></i>Add to Reading List</button>` : ''}
                    </div>
                </div>`;
            }).join('');
            document.querySelectorAll('.request-btn').forEach(btn => btn.onclick = async () => {
                await apiService.create('library', { bookId: btn.dataset.bookid, memberId: currentUser.id, requestDate: new Date().toISOString().slice(0, 10), status: 'Pending' }, 'reservations');
                showToast('Book requested! You will be notified when available.', 'success');
                renderLibraryPage();
            });
            document.querySelectorAll('.edit-book-btn').forEach(btn => { btn.onclick = () => { const bookToEdit = libraryData.books.find(b => b.bookId === btn.dataset.bookid); if (bookToEdit) openBookForm(bookToEdit); } });
            document.querySelectorAll('.add-to-list-btn').forEach(btn => btn.onclick = () => handleAddToList(btn.dataset.bookid));
        };
        document.getElementById('book-search').oninput = (e) => {
            const term = e.target.value.toLowerCase().replace(/-/g, '');
            const filteredBooks = libraryData.books.filter(b => b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term) || b.genre.toLowerCase().includes(term) || (b.isbn && b.isbn.replace(/-/g, '').includes(term)));
            renderBookList(filteredBooks);
        };
        renderBookList(libraryData.books);
    };
    
    const renderTransactions = () => {
        const container = document.getElementById('transactions');
        container.innerHTML = `
            <div class="flex justify-end mb-4"><button id="issue-book-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"><i class="fas fa-plus-circle"></i> Issue Book</button></div>
            <div class="overflow-x-auto bg-slate-800 rounded-lg"><table class="min-w-full text-sm text-left"><thead class="bg-slate-700 text-slate-300 uppercase"><tr><th class="p-3">Book</th><th class="p-3">Member</th><th class="p-3">Issue Date</th><th class="p-3">Due Date</th><th class="p-3">Status</th><th class="p-3 text-right">Actions</th></tr></thead><tbody class="text-slate-300">${libraryData.transactions.sort((a,b) => new Date(b.issueDate) - new Date(a.issueDate)).map(t => { const overdueDays = calculateOverdueDays(t.dueDate); const member = memberMap.get(t.memberId); return `<tr class="border-b border-slate-700 hover:bg-slate-700/50"><td class="p-3 font-semibold">${bookMap.get(t.bookId)?.title || 'N/A'}</td><td class="p-3">${member?.name || 'N/A'} <span class="text-xs text-slate-500">(${member?.role || 'N/A'})</span></td><td class="p-3">${formatDate(t.issueDate)}</td><td class="p-3 ${t.status === 'Issued' && overdueDays > 0 ? 'text-red-400 font-bold' : ''}">${formatDate(t.dueDate)}</td><td class="p-3"><span class="status-badge status-${t.status.toLowerCase()}">${t.status}</span></td><td class="p-3 text-right">${t.status === 'Issued' ? `<button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded return-btn text-xs" data-id="${t.transactionId}">Mark Returned</button>` : `<span class="text-slate-500 text-xs">Returned on ${formatDate(t.returnDate)}</span>`}</td></tr>`; }).join('')}</tbody></table></div>`;
        
        document.getElementById('issue-book-btn').onclick = () => {
            const availableBooks = libraryData.books.filter(b => b.availableCopies > 0);
            const allMembers = Array.from(memberMap.values());

            const formFields = [
                { name: 'bookId', label: 'Book', type: 'select', options: availableBooks.map(b => `<option value="${b.bookId}">${b.title} (${b.author})</option>`).join(''), required: true },
                // --- THE VISIBLE FIX ---
                // This .map() function will now work perfectly because each 'm' object has a 'role'.
                { name: 'memberId', label: 'Member', type: 'select', options: allMembers.map(m => `<option value="${m.id}" data-role="${m.role}">${m.name} (${m.role})</option>`).join(''), required: true },
                { name: 'dueDate', label: 'Due Date', type: 'date', required: true }
            ];
            
            openFormModal('Issue a Book', formFields, async (formData) => {
                await apiService.create('library', { ...formData, issueDate: new Date().toISOString().slice(0, 10), status: 'Issued', returnDate: null }, 'transactions');
                const book = bookMap.get(formData.bookId); await apiService.update('library', book.bookId, { availableCopies: book.availableCopies - 1 }, 'books', 'bookId');
                showToast('Book issued successfully', 'success'); renderLibraryPage();
            });

            const memberSelect = document.getElementById('memberId'); 
            const dueDateInput = document.getElementById('dueDate');
            const updateDueDate = () => {
                if (!memberSelect || !dueDateInput) return;
                const selectedOption = memberSelect.options[memberSelect.selectedIndex];
                const memberRole = selectedOption.dataset.role;
                let defaultDueDate = new Date();
                const loanDays = (memberRole === 'Teacher') ? 28 : 14;
                defaultDueDate.setDate(defaultDueDate.getDate() + loanDays);
                dueDateInput.value = defaultDueDate.toISOString().slice(0, 10);
            };
            memberSelect.onchange = updateDueDate; 
            updateDueDate(); // Set initial value
        };
        document.querySelectorAll('.return-btn').forEach(btn => btn.onclick = () => handleReturn(btn.dataset.id));
    };

    const renderReservations = () => {
        const container = document.getElementById('reservations');
        const pendingReservations = libraryData.reservations.filter(r => r.status === 'Pending');
        container.innerHTML = `
            <h3 class="text-xl font-semibold mb-4 text-white">Pending Book Requests</h3><div class="space-y-3">${pendingReservations.length > 0 ? pendingReservations.map(r => { const book = bookMap.get(r.bookId); const member = memberMap.get(r.memberId); return `<div class="p-4 rounded-lg bg-slate-800/70 flex flex-wrap justify-between items-center gap-4"><div><span class="font-bold text-white">${book?.title || 'N/A'}</span> requested by <span class="font-semibold text-blue-300">${member?.name || 'N/A'}</span></div><div>${book?.availableCopies > 0 ? `<button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded issue-from-request-btn" data-resid="${r.reservationId}" data-bookid="${r.bookId}" data-memberid="${r.memberId}">Approve & Issue</button>` : `<span class="text-yellow-400 font-semibold">Book Unavailable</span>`}</div></div>`; }).join('') : '<p class="text-slate-500 italic">There are no pending book requests.</p>'}</div>`;
        document.querySelectorAll('.issue-from-request-btn').forEach(btn => btn.onclick = async (e) => {
            const { resid, bookid, memberid } = e.currentTarget.dataset;
            const member = memberMap.get(memberid);
            const loanDays = (member.role === 'Teacher') ? 28 : 14;
            const dueDate = new Date(new Date().setDate(new Date().getDate() + loanDays)).toISOString().slice(0, 10);

            await apiService.create('library', { bookId: bookid, memberId: memberid, status: 'Issued', issueDate: new Date().toISOString().slice(0, 10), dueDate: dueDate }, 'transactions');
            await apiService.update('library', resid, { status: 'Fulfilled' }, 'reservations', 'reservationId');
            const book = bookMap.get(bookid); await apiService.update('library', bookid, { availableCopies: book.availableCopies - 1 }, 'books', 'bookId');
            showToast(`Book issued to ${member.name}!`, 'success'); renderLibraryPage();
        });
    };

    const renderMemberManagement = () => {
        const container = document.getElementById('members'); 
        const allMembers = Array.from(memberMap.values());
        container.innerHTML = `<input type="text" id="member-search" placeholder="Search by name or email..." class="w-full md:w-1/2 p-2 mb-4 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 text-white"><div id="member-list" class="space-y-3"></div>`;
        const renderMemberList = (members) => {
            document.getElementById('member-list').innerHTML = members.map(member => {
                const transactions = libraryData.transactions.filter(t => t.memberId === member.id);
                const fines = store.get('fees').filter(f => f.studentId === member.id && f.feeType === 'Library Fine' && f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0);
                return `<div class="p-4 rounded-lg bg-slate-800/70"><div class="flex justify-between items-start"><div><p class="font-bold text-white">${member.name}</p><p class="text-sm text-slate-400">${member.email}</p><p class="text-xs px-2 py-0.5 mt-1 inline-block rounded-full bg-purple-500/20 text-purple-300">${member.role}</p></div><div class="text-right"><p class="text-sm text-slate-300">Borrowed: ${transactions.length}</p>${fines > 0 ? `<p class="text-sm font-bold text-red-400">Fine: BDT ${fines}</p>` : ''}</div></div></div>`;
            }).join('');
        };
        document.getElementById('member-search').oninput = (e) => { const term = e.target.value.toLowerCase(); const filteredMembers = allMembers.filter(m => m.name.toLowerCase().includes(term) || (m.email && m.email.toLowerCase().includes(term))); renderMemberList(filteredMembers); };
        renderMemberList(allMembers);
    };

    const renderReports = () => {
        const container = document.getElementById('reports');
container.innerHTML = `
        <h3 class="text-xl font-semibold mb-4 text-white">Generate & Export Reports</h3>
        <div class="space-y-6">
            <div class="bg-slate-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-2 text-slate-200">Inventory Reports</h4>
                <button id="export-inventory-btn" class="btn btn-glow bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">Export Full Inventory (.csv)</button>
            </div>
            <div class="bg-slate-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-2 text-slate-200">Financial Reports</h4>
                <button id="export-fines-btn" class="btn btn-glow bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Export Unpaid Fines (.csv)</button>
            </div>
            <div class="bg-slate-800 p-4 rounded-lg">
                <h4 class="font-semibold mb-2 text-slate-200">Transaction Log</h4>
                <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                    <input type="date" id="report-start-date" class="p-2 rounded-lg bg-slate-700 border-slate-600 text-white w-full sm:w-auto">
                    <span class="text-slate-400 text-center">to</span>
                    <input type="date" id="report-end-date" class="p-2 rounded-lg bg-slate-700 border-slate-600 text-white w-full sm:w-auto">
                    <button id="export-transactions-btn" class="btn btn-glow bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap">Export Transactions</button>
                </div>
            </div>
        </div>
    `;

        document.getElementById('export-inventory-btn').onclick = () => { const headers = ['Book_ID', 'Title', 'Author', 'Genre', 'Publication_Year', 'ISBN', 'Total_Copies', 'Available_Copies']; const rows = libraryData.books.map(b => [b.bookId, `"${b.title.replace(/"/g, '""')}"`, `"${b.author.replace(/"/g, '""')}"`, b.genre, b.publicationYear, b.isbn, b.totalCopies, b.availableCopies]); exportToCsv('library_inventory.csv', headers, rows); };
        document.getElementById('export-fines-btn').onclick = () => { const headers = ['Member_Name', 'Member_Email', 'Fee_Type', 'Amount', 'Due_Date']; const rows = store.get('fees').filter(f => f.feeType === 'Library Fine' && f.status === 'Unpaid').map(f => { const member = memberMap.get(f.studentId); return [member?.name, member?.email, f.feeType, f.amount, f.dueDate]; }); exportToCsv('unpaid_library_fines.csv', headers, rows); };
        document.getElementById('export-transactions-btn').onclick = () => { const startDate = document.getElementById('report-start-date').value; const endDate = document.getElementById('report-end-date').value; if(!startDate || !endDate) { showToast('Please select a start and end date for the report.', 'error'); return; } const filteredTransactions = libraryData.transactions.filter(t => { const issueDate = new Date(t.issueDate); return issueDate >= new Date(startDate) && issueDate <= new Date(endDate); }); const headers = ['Transaction_ID', 'Book_Title', 'Member_Name', 'Issue_Date', 'Due_Date', 'Return_Date', 'Status']; const rows = filteredTransactions.map(t => { const book = bookMap.get(t.bookId); const member = memberMap.get(t.memberId); return [t.transactionId, book?.title, member?.name, t.issueDate, t.dueDate, t.returnDate || 'N/A', t.status]; }); exportToCsv(`transactions_${startDate}_to_${endDate}.csv`, headers, rows); };
    };

    const renderMyBooks = () => {
        const container = document.getElementById('my-books');
        const myTransactions = libraryData.transactions.filter(t => t.memberId === currentUser.id);
        const issuedBooks = myTransactions.filter(t => t.status === 'Issued');
        const historyBooks = myTransactions.filter(t => t.status === 'Returned');
        const myReservations = libraryData.reservations.filter(r => r.memberId === currentUser.id && r.status === 'Pending');
        const myFines = store.get('fees').filter(f => f.studentId === currentUser.id && f.feeType === 'Library Fine' && f.status === 'Unpaid');

        container.innerHTML = `
            <div class="space-y-8">
                 <div>
                    <h4 class="text-xl font-semibold mb-3 text-white"><i class="fas fa-book-open mr-2 text-blue-400"></i>Books I Have</h4>
                    <div class="space-y-3">${issuedBooks.length > 0 ? issuedBooks.map(t => { const book = bookMap.get(t.bookId); const overdueDays = calculateOverdueDays(t.dueDate); return `<div class="p-4 rounded-lg ${overdueDays > 0 ? 'bg-red-900/40 border border-red-700' : 'bg-slate-800/70'} flex flex-wrap justify-between items-center gap-4"><div><span class="font-bold text-white">${book?.title || 'N/A'}</span> <span class="text-slate-400">by ${book?.author || 'N/A'}</span></div><div class="text-right ${overdueDays > 0 ? 'text-red-400 font-bold' : 'text-slate-300'}">Due: ${formatDate(t.dueDate)} ${overdueDays > 0 ? `(${overdueDays} days overdue)` : ''}</div></div>`; }).join('') : '<p class="text-slate-500 italic px-4">You have not borrowed any books.</p>'}</div>
                </div>
                <div>
                    <h4 class="text-xl font-semibold mb-3 text-white"><i class="fas fa-clock mr-2 text-yellow-400"></i>My Pending Requests</h4>
                    <div class="space-y-3">${myReservations.length > 0 ? myReservations.map(r => { const book = bookMap.get(r.bookId); return `<div class="p-4 rounded-lg bg-slate-800/70 flex flex-wrap justify-between items-center gap-4"><div><span class="font-bold text-white">${book?.title || 'N/A'}</span></div><div class="flex items-center gap-4"><span class="status-badge status-pending">Pending</span><button class="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-lg text-sm cancel-request-btn" data-resid="${r.reservationId}">Cancel</button></div></div>`; }).join('') : '<p class="text-slate-500 italic px-4">You have no pending book requests.</p>'}</div>
                </div>
                <div>
                    <h4 class="text-xl font-semibold mb-3 text-white"><i class="fas fa-history mr-2 text-gray-400"></i>Borrowing History</h4>
                    <div class="space-y-3">${historyBooks.length > 0 ? historyBooks.map(t => { const book = bookMap.get(t.bookId); return `<div class="p-4 rounded-lg bg-slate-800/70 flex flex-wrap justify-between items-center gap-4"><div><span class="font-bold text-white">${book?.title || 'N/A'}</span></div><div class="text-slate-400">Returned: ${formatDate(t.returnDate)}</div></div>`; }).join('') : '<p class="text-slate-500 italic px-4">No borrowing history yet.</p>'}</div>
                </div>
                <div>
                    <h4 class="text-xl font-semibold mb-3 text-white"><i class="fas fa-exclamation-triangle mr-2 text-red-500"></i>My Library Fines</h4>
                    <div class="space-y-3">${myFines.length > 0 ? myFines.map(f => `<div class="p-4 rounded-lg bg-red-900/50 border border-red-800 flex flex-wrap justify-between items-center gap-4"><div>Fine for late return. Amount: <span class="font-bold text-white">BDT ${f.amount}</span></div><button class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg" onclick="alert('Integration with a payment gateway is required.')">Pay Now</button></div>`).join('') : '<p class="text-slate-500 italic px-4">You have no outstanding library fines. Great job!</p>'}</div>
                </div>
            </div>`;
        document.querySelectorAll('.cancel-request-btn').forEach(btn => btn.onclick = () => cancelRequest(btn.dataset.resid));
    };
    
    const renderReadingLists = () => {
        const container = document.getElementById('reading-lists');
        if (currentUser.role === 'Teacher') {
            const myReadingLists = libraryData.readingLists.filter(l => l.teacherId === currentUser.id);
            container.innerHTML = `
                <div class="flex justify-between items-center mb-4"><h3 class="text-xl font-semibold text-white">My Reading Lists</h3><button id="create-list-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Create New List</button></div>
                <div class="space-y-4">${myReadingLists.length > 0 ? myReadingLists.map(list => `
                    <div class="p-4 bg-slate-800 rounded-lg">
                        <div class="flex justify-between items-center">
                            <h4 class="text-lg font-bold text-white">${list.name}</h4>
                            <button class="text-red-500 delete-list-btn" data-listid="${list.id}"><i class="fas fa-trash"></i></button>
                        </div>
                        <p class="text-sm text-slate-400">Assigned to: ${sectionMap.get(list.sectionId)?.name || 'N/A'}</p>
                        <ul class="mt-2 space-y-2 list-disc list-inside">${list.bookIds.map(bookId => { const book = bookMap.get(bookId); return book ? `<li class="text-slate-300 ml-4">${book.title}</li>` : ''; }).join('')}</ul>
                    </div>`).join('') : '<p class="text-slate-500 italic">You have not created any reading lists.</p>'}</div>`;
            
            document.getElementById('create-list-btn').onclick = () => {
                // Now correctly filters sections where the current user is the Class Teacher.
                const mySections = store.get('sections').filter(s => s.classTeacherId?.id === currentUser.id);
                if (mySections.length === 0) { showToast("You must be assigned as a Class Teacher to a section to create a reading list.", "error"); return; }
                
                openFormModal('Create New Reading List', [
                    { name: 'name', label: 'List Name (e.g., "History 101 Required Reading")', type: 'text', required: true },
                    // The form now uses 'sectionId' and provides a list of sections.
                    { name: 'sectionId', label: 'Assign to Section', type: 'select', options: mySections.map(s => `<option value="${s.id}">${s.subjectId.name} - Section ${s.name}</option>`).join(''), required: true },
                ], async (formData) => {
                    await apiService.create('library', { ...formData, teacherId: currentUser.id, bookIds: [] }, 'readingLists');
                    showToast('Reading list created!', 'success'); 
                    renderLibraryPage();
                });
            };

            document.querySelectorAll('.delete-list-btn').forEach(btn => {
                btn.onclick = () => showConfirmationModal('Are you sure you want to delete this list?', async () => {
                    await apiService.remove('library', btn.dataset.listid, 'readingLists', 'id');
                    renderLibraryPage();
                });
            });
        }  else { // Student View
            // This logic is now updated to check the student's assigned sectionId.
            const mySectionLists = libraryData.readingLists.filter(list => list.sectionId === currentUser.sectionId);
            container.innerHTML = `
                <h3 class="text-2xl font-bold mb-6 text-white">Course Reading Lists</h3>
                <div class="space-y-6">${mySectionLists.length > 0 ? mySectionLists.map(list => {
                    const teacher = teacherMap.get(list.teacherId);
                    return `<div class="p-4 sm:p-6 bg-slate-800 rounded-lg shadow-md">
                                <div class="border-b border-slate-700 pb-3 mb-3">
                                    <h4 class="text-xl font-bold text-white">${list.name}</h4>
                                    <p class="text-sm text-slate-400">Curated by: ${teacher ? teacher.name : 'N/A'}</p>
                                </div>
                                <ul class="space-y-3">${list.bookIds.map(bookId => { const book = bookMap.get(bookId); if (!book) return ''; return `<li class="text-slate-300 flex items-center gap-3"><i class="fas fa-book text-teal-400"></i><div><a href="#" class="font-semibold hover:underline view-book-in-catalog" data-book-title="${book.title}">${book.title}</a><span class="text-slate-500 text-sm block">by ${book.author}</span></div></li>`; }).join('')}</ul>
                            </div>`
                }).join('') : '<p class="text-slate-500 italic">Your teachers have not assigned any reading lists for your section yet.</p>'}</div>`;
          
                    document.querySelectorAll('.view-book-in-catalog').forEach(link => {
                     link.onclick = (e) => {
                    e.preventDefault();
                    document.querySelector('.tab-link[data-tab="catalog"]').click();
                    const searchInput = document.getElementById('book-search');
                    searchInput.value = link.dataset.bookTitle;
                    searchInput.dispatchEvent(new Event('input'));
                };
            });
        }
    };

    // --- 5. INITIAL TAB ACTIVATION ---
    if (currentUser.role === 'Admin' || currentUser.role === 'Librarian') {
        renderLibrarianDashboard();
        renderCatalog('catalog');
        renderTransactions();
        renderReservations();
        renderMemberManagement();
        renderReports();
    } else { // Student or Teacher
        renderCatalog('catalog');
        renderMyBooks();
        renderReadingLists();
    }

    // Tab switching logic
    document.querySelectorAll('.tab-link').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabButton = e.currentTarget;
            // Deactivate all tabs
            document.querySelectorAll('.tab-link').forEach(btn => {
                btn.classList.remove('active', 'text-blue-400', 'border-blue-400');
                btn.classList.add('text-slate-400', 'border-transparent');
            });
            // Hide all content
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            // Activate clicked tab
            tabButton.classList.add('active', 'text-blue-400', 'border-blue-400');
            tabButton.classList.remove('text-slate-400', 'border-transparent');
            // Show clicked tab's content
            document.getElementById(tabButton.dataset.tab).classList.remove('hidden');
        });
    });
}