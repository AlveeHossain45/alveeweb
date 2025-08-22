import { apiService } from '../apiService.js';
import { store } from '../store.js';
import { currentUser, ui } from '../ui.js';
import { showToast } from '../utils/helpers.js';

export async function renderFeesPage() {
    // --- STUDENT VIEW (PREMIUM & ENHANCED) ---
    if (currentUser.role === 'Student') {
        await store.refresh('fees'); // সর্বশেষ ফি-এর ডেটা আনা হচ্ছে
        
        // শুধুমাত্র লগইন করা ছাত্রের ফি ফিল্টার করা হচ্ছে
        const myFees = store.get('fees').filter(fee => 
            (fee.studentId?._id === currentUser.studentId) || (fee.studentId === currentUser.studentId)
        ).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
        
        const totalDue = myFees.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0);
        const totalPaid = myFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);
        
        const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

        // Premium UI with luxurious design
        ui.contentArea.innerHTML = `
            <div class="animate-fade-in space-y-8">
                <!-- Premium Page Header with Glass Effect -->
                <div class="premium-header">
                    <div class="header-content">
                        <div class="header-text">
                            <h2 class="premium-title">My Fees & Payments</h2>
                            <p class="premium-subtitle">Track and manage all your fee payments with elegance</p>
                        </div>
                        <div class="header-actions">
                            <div class="premium-dropdown">
                                <button class="statement-button">
                                    <svg class="dropdown-icon" viewBox="0 0 24 24">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                    </svg>
                                    <span>Generate Statement</span>
                                    <svg class="dropdown-chevron" viewBox="0 0 24 24">
                                        <path d="M6 9l6 6 6-6"/>
                                    </svg>
                                </button>
                                <div class="dropdown-menu">
                                    <a href="#" class="dropdown-item">
                                        <svg class="menu-icon" viewBox="0 0 24 24">
                                            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                                        </svg>
                                        Current Month
                                    </a>
                                    <a href="#" class="dropdown-item">
                                        <svg class="menu-icon" viewBox="0 0 24 24">
                                            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                                            <path d="M12 21v-6m0 0V9m0 6H7m5 0h5"/>
                                        </svg>
                                        Last 3 Months
                                    </a>
                                    <a href="#" class="dropdown-item">
                                        <svg class="menu-icon" viewBox="0 0 24 24">
                                            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                                            <path d="M17 14l-2-2-2 2m4-6l-2-2-2 2"/>
                                        </svg>
                                        Custom Range
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Premium Summary Cards with Neumorphism Effect -->
                <div class="premium-cards-grid">
                    <!-- Total Fees Card -->
                    <div class="premium-card card-purple">
                        <div class="card-icon">
                            <svg viewBox="0 0 24 24" class="icon-xl">
                                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div class="card-content">
                            <p class="card-label">Total Fees</p>
                            <p class="card-value">${formatCurrency(totalDue + totalPaid)}</p>
                        </div>
                        <div class="card-badge">
                            <svg viewBox="0 0 24 24" class="icon-xs">
                                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>All time</span>
                        </div>
                    </div>
                    
                    <!-- Outstanding Card -->
                    <div class="premium-card card-amber">
                        <div class="card-icon">
                            <svg viewBox="0 0 24 24" class="icon-xl">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                        <div class="card-content">
                            <p class="card-label">Outstanding</p>
                            <p class="card-value">${formatCurrency(totalDue)}</p>
                        </div>
                        <button class="card-action-button">
                            <svg viewBox="0 0 24 24" class="icon-xs">
                                <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            Pay Now
                        </button>
                    </div>
                    
                    <!-- Total Paid Card -->
                    <div class="premium-card card-green">
                        <div class="card-icon">
                            <svg viewBox="0 0 24 24" class="icon-xl">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <div class="card-content">
                            <p class="card-label">Total Paid</p>
                            <p class="card-value">${formatCurrency(totalPaid)}</p>
                        </div>
                        <div class="card-badge">
                            <svg viewBox="0 0 24 24" class="icon-xs">
                                <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            ${myFees.filter(f => f.status === 'Paid').length} receipts
                        </div>
                    </div>
                </div>
                
                <!-- Enhanced Fee History with Premium Filters -->
                <div class="premium-table-container">
                    <div class="table-header">
                        <h3 class="table-title">Fee History</h3>
                        <div class="table-controls">
                            <div class="premium-select">
                                <svg class="select-icon" viewBox="0 0 24 24">
                                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                                </svg>
                                <select class="premium-select-input">
                                    <option>All Time</option>
                                    <option>This Month</option>
                                    <option>Last Month</option>
                                    <option>Custom Range</option>
                                </select>
                            </div>
                            <div class="premium-select">
                                <svg class="select-icon" viewBox="0 0 24 24">
                                    <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                                </svg>
                                <select class="premium-select-input">
                                    <option>All Status</option>
                                    <option>Paid Only</option>
                                    <option>Unpaid Only</option>
                                </select>
                            </div>
                            <button class="refresh-button">
                                <svg viewBox="0 0 24 24" class="icon-sm">
                                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-content">
                        ${myFees.length > 0 ? myFees.map(fee => {
                            const isUnpaid = fee.status === 'Unpaid';
                            const statusInfo = {
                                class: isUnpaid ? 'status-unpaid' : 'status-paid',
                                icon: isUnpaid ? `
                                    <svg viewBox="0 0 24 24" class="icon-sm">
                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                    </svg>
                                ` : `
                                    <svg viewBox="0 0 24 24" class="icon-sm">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                `,
                                text: fee.status
                            };
                            return `
                            <div class="premium-table-row ${isUnpaid ? 'border-l-amber-500' : 'border-l-green-500'}">
                                <div class="row-icon ${isUnpaid ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}">
                                    ${fee.feeType.includes('Tuition') ? `
                                        <svg viewBox="0 0 24 24" class="icon-lg">
                                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                        </svg>
                                    ` : fee.feeType.includes('Exam') ? `
                                        <svg viewBox="0 0 24 24" class="icon-lg">
                                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                    ` : `
                                        <svg viewBox="0 0 24 24" class="icon-lg">
                                            <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                    `}
                                </div>
                                <div class="row-content">
                                    <div class="content-header">
                                        <p class="content-title">${fee.feeType}</p>
                                        ${isUnpaid && new Date(fee.dueDate) > new Date() ? `
                                        <span class="content-badge bg-amber-500/10 text-amber-400 border-amber-500/20">
                                            <svg viewBox="0 0 24 24" class="icon-xs">
                                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                            </svg>
                                            Due in ${Math.ceil((new Date(fee.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                                        </span>` : ''}
                                        ${isUnpaid && new Date(fee.dueDate) <= new Date() ? `
                                        <span class="content-badge bg-red-500/10 text-red-400 border-red-500/20">
                                            <svg viewBox="0 0 24 24" class="icon-xs">
                                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                            </svg>
                                            Overdue
                                        </span>` : ''}
                                    </div>
                                    <div class="content-details">
                                        <span>
                                            <svg viewBox="0 0 24 24" class="icon-xs text-gray-500">
                                                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            Due: ${formatDate(fee.dueDate)}
                                        </span>
                                        ${!isUnpaid ? `
                                        <span>
                                            <svg viewBox="0 0 24 24" class="icon-xs text-gray-500">
                                                <path d="M5 13l4 4L19 7"/>
                                            </svg>
                                            Paid: ${formatDate(fee.paidDate)}
                                        </span>` : ''}
                                    </div>
                                </div>
                                <div class="row-actions">
                                    <p class="action-amount">${formatCurrency(fee.amount)}</p>
                                    <div class="action-status ${statusInfo.class}">
                                        ${statusInfo.icon}
                                        ${statusInfo.text}
                                    </div>
                                    ${isUnpaid ? `
                                    <button class="action-button pay-now-button">
                                        <svg viewBox="0 0 24 24" class="icon-xs">
                                            <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                        Pay Now
                                    </button>` : `
                                    <button class="action-button view-receipt-button">
                                        <svg viewBox="0 0 24 24" class="icon-xs">
                                            <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        View Receipt
                                    </button>`}
                                </div>
                            </div>
                            `;
                        }).join('') : `
                        <div class="empty-state">
                            <div class="empty-icon">
                                <svg viewBox="0 0 24 24" class="icon-3xl">
                                    <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <h4 class="empty-title">No Fee Records Found</h4>
                            <p class="empty-description">It looks like you don't have any outstanding or past fee records at this moment.</p>
                        </div>`}
                    </div>
                </div>
            </div>
            
            <!-- Premium Payment Modal -->
            <div id="payment-modal" class="premium-modal">
                <div class="modal-overlay"></div>
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">Make Payment</h3>
                        <button id="close-payment-modal" class="modal-close-button">
                            <svg viewBox="0 0 24 24" class="icon-sm">
                                <path d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-content">
                        <p class="modal-subtitle">Complete your payment securely</p>
                        
                        <div class="payment-summary">
                            <p class="summary-label">You're paying</p>
                            <p class="summary-amount">৳ 5,000.00</p>
                            <p class="summary-detail">Tuition Fee - March 2025</p>
                        </div>
                        
                        <div class="payment-methods">
                            <label class="methods-label">Payment Method</label>
                            <div class="methods-grid">
                                <button class="method-card active">
                                    <svg viewBox="0 0 24 24" class="method-icon text-indigo-400">
                                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                    </svg>
                                    <span>Card</span>
                                </button>
                                <button class="method-card">
                                    <svg viewBox="0 0 24 24" class="method-icon text-green-400">
                                        <path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                                    </svg>
                                    <span>Mobile</span>
                                </button>
                                <button class="method-card">
                                    <svg viewBox="0 0 24 24" class="method-icon text-purple-400">
                                        <path d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
                                    </svg>
                                    <span>Bank</span>
                                </button>
                            </div>
                        </div>
                        
                        <button class="payment-confirm-button">
                            <svg viewBox="0 0 24 24" class="icon-sm">
                                <path d="M12 15l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m-8 2H6a2 2 0 01-2-2V6a2 2 0 012-2h8l2 2h4a2 2 0 012 2v6m-6 4a4 4 0 100-8 4 4 0 000 8z"/>
                            </svg>
                            Pay Now Securely
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
                /* Premium Global Styles */
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                /* Premium Header Styles */
                .premium-header {
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
                    padding: 24px;
                    transition: all 0.3s ease;
                }
                
                .premium-header:hover {
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
                    transform: translateY(-2px);
                }
                
                .header-content {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                @media (min-width: 768px) {
                    .header-content {
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                    }
                }
                
                .premium-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: #ffffff;
                    line-height: 1.2;
                    letter-spacing: -0.5px;
                    margin: 0;
                }
                
                .premium-subtitle {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    margin-top: 8px;
                }
                
                .statement-button {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 20px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 500;
                    transition: all 0.3s ease;
                }
                
                .statement-button:hover {
                    background: rgba(30, 41, 59, 0.7);
                    color: #ffffff;
                    border-color: rgba(255, 255, 255, 0.2);
                }
                
                .dropdown-icon {
                    width: 16px;
                    height: 16px;
                    fill: currentColor;
                }
                
                .dropdown-chevron {
                    width: 12px;
                    height: 12px;
                    fill: currentColor;
                    transition: transform 0.3s ease;
                }
                
                .premium-dropdown:hover .dropdown-chevron {
                    transform: rotate(180deg);
                }
                
                .dropdown-menu {
                    position: absolute;
                    right: 0;
                    margin-top: 8px;
                    min-width: 180px;
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                    opacity: 0;
                    pointer-events: none;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                    z-index: 10;
                }
                
                .premium-dropdown:hover .dropdown-menu {
                    opacity: 1;
                    pointer-events: auto;
                    transform: translateY(0);
                }
                
                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                
                .dropdown-item:hover {
                    background: rgba(124, 58, 237, 0.1);
                    color: #ffffff;
                }
                
                .dropdown-item:first-child {
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                }
                
                .dropdown-item:last-child {
                    border-bottom-left-radius: 12px;
                    border-bottom-right-radius: 12px;
                }
                
                .menu-icon {
                    width: 14px;
                    height: 14px;
                    fill: currentColor;
                }
                
                /* Premium Cards Grid */
                .premium-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(1, 1fr);
                    gap: 20px;
                }
                
                @media (min-width: 768px) {
                    .premium-cards-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                
                .premium-card {
                    position: relative;
                    padding: 24px;
                    border-radius: 16px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    z-index: 1;
                }
                
                .premium-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: inherit;
                    z-index: -1;
                }
                
                .premium-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
                }
                
                .card-purple:hover::before {
                    border-color: rgba(124, 58, 237, 0.3);
                    box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.3), 0 0 20px rgba(124, 58, 237, 0.1);
                }
                
                .card-amber:hover::before {
                    border-color: rgba(245, 158, 11, 0.3);
                    box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.1);
                }
                
                .card-green:hover::before {
                    border-color: rgba(16, 185, 129, 0.3);
                    box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.1);
                }
                
                .card-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                
                .card-purple .card-icon {
                    background: rgba(124, 58, 237, 0.1);
                    color: rgba(167, 139, 250, 1);
                }
                
                .card-amber .card-icon {
                    background: rgba(245, 158, 11, 0.1);
                    color: rgba(252, 211, 77, 1);
                }
                
                .card-green .card-icon {
                    background: rgba(16, 185, 129, 0.1);
                    color: rgba(110, 231, 183, 1);
                }
                
                .icon-xl {
                    width: 24px;
                    height: 24px;
                    stroke-width: 2;
                    stroke: currentColor;
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                .card-label {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .card-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #ffffff;
                    line-height: 1.2;
                }
                
                .card-badge {
                    position: absolute;
                    bottom: 16px;
                    right: 16px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    color: rgba(167, 139, 250, 0.7);
                }
                
                .icon-xs {
                    width: 12px;
                    height: 12px;
                    stroke-width: 2;
                    stroke: currentColor;
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                .card-action-button {
                    position: absolute;
                    bottom: 16px;
                    right: 16px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    border-radius: 8px;
                    background: rgba(245, 158, 11, 0.3);
                    color: rgba(252, 211, 77, 1);
                    transition: all 0.2s ease;
                }
                
                .card-action-button:hover {
                    background: rgba(245, 158, 11, 0.5);
                    color: #ffffff;
                }
                
                /* Premium Table Container */
                .premium-table-container {
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
                    padding: 24px;
                    transition: all 0.3s ease;
                }
                
                .premium-table-container:hover {
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
                }
                
                .table-header {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 24px;
                }
                
                @media (min-width: 768px) {
                    .table-header {
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                    }
                }
                
                .table-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #ffffff;
                    margin: 0;
                }
                
                .table-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .premium-select {
                    position: relative;
                }
                
                .select-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 14px;
                    height: 14px;
                    stroke-width: 2;
                    stroke: rgba(255, 255, 255, 0.5);
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                .premium-select-input {
                    padding: 10px 12px 10px 36px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 14px;
                    transition: all 0.2s ease;
                }
                
                .premium-select-input:hover {
                    border-color: rgba(255, 255, 255, 0.2);
                }
                
                .premium-select-input:focus {
                    outline: none;
                    border-color: rgba(124, 58, 237, 0.5);
                    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
                }
                
                .refresh-button {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    color: rgba(255, 255, 255, 0.8);
                    transition: all 0.2s ease;
                }
                
                .refresh-button:hover {
                    background: rgba(30, 41, 59, 0.7);
                    color: #ffffff;
                    border-color: rgba(255, 255, 255, 0.2);
                }
                
                .icon-sm {
                    width: 16px;
                    height: 16px;
                    stroke-width: 2;
                    stroke: currentColor;
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                /* Premium Table Rows */
                .premium-table-row {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 16px;
                    margin-bottom: 12px;
                    background: rgba(30, 41, 59, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    border-left-width: 4px;
                    transition: all 0.3s ease;
                }
                
                @media (min-width: 640px) {
                    .premium-table-row {
                        flex-direction: row;
                        align-items: center;
                        gap: 24px;
                    }
                }
                
                .premium-table-row:hover {
                    background: rgba(30, 41, 59, 0.6);
                    border-color: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                
                .row-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .icon-lg {
                    width: 20px;
                    height: 20px;
                    stroke-width: 2;
                    stroke: currentColor;
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                .row-content {
                    flex-grow: 1;
                    min-width: 0;
                }
                
                .content-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 8px;
                }
                
                .content-title {
                    font-weight: 600;
                    color: #ffffff;
                    margin: 0;
                }
                
                .content-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    font-size: 12px;
                    font-weight: 500;
                    border-radius: 8px;
                    border: 1px solid;
                }
                
                .content-details {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                }
                
                .content-details span {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .row-actions {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 8px;
                    min-width: 120px;
                }
                
                .action-amount {
                    font-size: 18px;
                    font-weight: 600;
                    color: #ffffff;
                    margin: 0;
                }
                
                .action-status {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    font-size: 12px;
                    font-weight: 500;
                    border-radius: 8px;
                    border: 1px solid;
                }
                
                .status-paid {
                    background: rgba(16, 185, 129, 0.1);
                    color: rgba(110, 231, 183, 1);
                    border-color: rgba(16, 185, 129, 0.2);
                }
                
                .status-unpaid {
                    background: rgba(245, 158, 11, 0.1);
                    color: rgba(252, 211, 77, 1);
                    border-color: rgba(245, 158, 11, 0.2);
                }
                
                .action-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: 600;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    width: 100%;
                    justify-content: center;
                }
                
                .pay-now-button {
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.8) 0%, rgba(217, 119, 6, 0.8) 100%);
                    color: #ffffff;
                    border: none;
                }
                
                .pay-now-button:hover {
                    background: linear-gradient(135deg, rgba(245, 158, 11, 1) 0%, rgba(217, 119, 6, 1) 100%);
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
                }
                
                .view-receipt-button {
                    background: rgba(30, 41, 59, 0.5);
                    color: rgba(255, 255, 255, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .view-receipt-button:hover {
                    background: rgba(30, 41, 59, 0.7);
                    color: #ffffff;
                    border-color: rgba(255, 255, 255, 0.2);
                }
                
                /* Empty State */
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                }
                
                .empty-icon {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(30, 41, 59, 0.5);
                    border-radius: 50%;
                    border: 2px dashed rgba(255, 255, 255, 0.1);
                }
                
                .icon-3xl {
                    width: 36px;
                    height: 36px;
                    stroke-width: 1.5;
                    stroke: rgba(255, 255, 255, 0.5);
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                .empty-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 8px;
                }
                
                .empty-description {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.6);
                    max-width: 400px;
                    margin: 0 auto;
                }
                
                /* Premium Modal */
                .premium-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 50;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                }
                
                .premium-modal.active {
                    display: flex;
                    animation: fadeIn 0.3s ease-out forwards;
                }
                
                .modal-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                
                .modal-container {
                    position: relative;
                    background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    width: 100%;
                    max-width: 420px;
                    overflow: hidden;
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
                    transform: scale(0.95);
                    opacity: 0;
                    animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .modal-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #ffffff;
                    margin: 0;
                }
                
                .modal-close-button {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    color: rgba(255, 255, 255, 0.7);
                    transition: all 0.2s ease;
                }
                
                .modal-close-button:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #ffffff;
                }
                
                .modal-content {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .modal-subtitle {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    margin-top: -12px;
                }
                
                .payment-summary {
                    background: rgba(30, 41, 59, 0.5);
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    text-align: center;
                }
                
                .summary-label {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 4px;
                }
                
                .summary-amount {
                    font-size: 28px;
                    font-weight: 700;
                    color: #ffffff;
                    margin: 0;
                }
                
                .summary-detail {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                    margin-top: 4px;
                }
                
                .payment-methods {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .methods-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.7);
                }
                
                .methods-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                }
                
                .method-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 16px;
                    background: rgba(30, 41, 59, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    transition: all 0.2s ease;
                }
                
                .method-card:hover {
                    background: rgba(30, 41, 59, 0.7);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                
                .method-card.active {
                    background: rgba(124, 58, 237, 0.2);
                    border-color: rgba(124, 58, 237, 0.5);
                    box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.5);
                }
                
                .method-icon {
                    width: 24px;
                    height: 24px;
                    stroke-width: 2;
                    stroke: currentColor;
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                
                .method-card span {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.8);
                }
                
                .method-card.active span {
                    color: #ffffff;
                }
                
                .payment-confirm-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, rgba(124, 58, 237, 0.9) 0%, rgba(99, 102, 241, 0.9) 100%);
                    border: none;
                    border-radius: 12px;
                    color: #ffffff;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.2);
                }
                
                .payment-confirm-button:hover {
                    background: linear-gradient(135deg, rgba(124, 58, 237, 1) 0%, rgba(99, 102, 241, 1) 100%);
                    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.3);
                    transform: translateY(-2px);
                }
            </style>
        `;
        
        // Add event listeners for payment buttons
        document.querySelectorAll('.fee-history-item button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const modal = document.getElementById('payment-modal');
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            });
        });
        
        // Close modal handler
        document.getElementById('close-payment-modal').addEventListener('click', () => {
             const modal = document.getElementById('payment-modal');
             modal.classList.add('hidden');
             modal.classList.remove('flex');
        });
        
        // Click outside modal to close
        document.getElementById('payment-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('payment-modal')) {
                const modal = document.getElementById('payment-modal');
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
        
        return;
    }

    // --- Accountant & Admin View (Premium Enhanced) ---
    let state = {
        view: 'departments',
        selectedDeptId: null, selectedDeptName: '',
        selectedSectionId: null, selectedSectionName: '',
        selectedStudent: null,
        studentFilter: { search: '', status: 'all', sort: 'name' },
        feeFilter: { status: 'all', dateRange: 'all' }
    };

    const formatCurrency = (value) => `৳ ${Number(value || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    const createPageHeader = (title, subtitle, backButtonTarget = null) => {
        const header = document.createElement('div');
        header.className = 'page-header flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 p-6 bg-gray-900/60 rounded-2xl border border-white/10 backdrop-blur-lg shadow-2xl shadow-black/20';
        
        let backButtonHtml = '';
        if (backButtonTarget) {
            backButtonHtml = `<button class="back-button group flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-700/70 rounded-lg border border-white/10 transition-all duration-300" data-target="${backButtonTarget}">
                <i class="fas fa-chevron-left text-gray-300 group-hover:text-white transition-colors"></i>
                <span class="text-gray-300 group-hover:text-white transition-colors">Back</span>
            </button>`;
        }
        
        header.innerHTML = `
            <div class="flex-1 min-w-0">
                <h2 class="text-2xl md:text-3xl font-bold text-white truncate tracking-tight">${title}</h2>
                <p class="text-gray-400 mt-1 truncate">${subtitle}</p>
            </div>
            ${backButtonHtml}
        `;
        
        if (backButtonTarget) {
            header.querySelector('.back-button').onclick = () => {
                const targetView = header.querySelector('.back-button').dataset.target;
                if (targetView === 'departments') state = { ...state, view: 'departments', selectedDeptId: null, selectedDeptName: '', selectedSectionId: null, selectedSectionName: '' };
                else if (targetView === 'sections') state = { ...state, view: 'sections', selectedSectionId: null, selectedSectionName: '', selectedStudent: null };
                else if (targetView === 'students') state = { ...state, view: 'students', selectedStudent: null };
                render();
            };
        }
        return header;
    };
    
    const render = async () => {
        ui.contentArea.innerHTML = getSkeletonLoaderHTML('dashboard');
        await Promise.all([ store.refresh('departments'), store.refresh('sections'), store.refresh('students'), store.refresh('fees') ]);
        
        const container = document.createElement('div');
        container.className = 'animate-fade-in';

        switch (state.view) {
            case 'departments':
                container.appendChild(createPageHeader('Fee Collection Dashboard', 'Select a department to begin'));
                container.appendChild(renderDepartmentView());
                break;
            case 'sections':
                container.appendChild(createPageHeader(`Department: ${state.selectedDeptName}`, 'Select a section to continue', 'departments'));
                container.appendChild(renderSectionView());
                break;
            case 'students':
                container.appendChild(createPageHeader(`Section: ${state.selectedSectionName}`, `Managing fees for ${state.selectedDeptName} department`, 'sections'));
                container.appendChild(renderStudentListView());
                break;
            case 'collect':
                 container.appendChild(createPageHeader(`Fee Management`, `Student: ${state.selectedStudent.name} (${state.selectedStudent.rollNo})`, 'students'));
                 container.appendChild(renderFeeCollectionForStudent());
                break;
        }
        ui.contentArea.innerHTML = '';
        ui.contentArea.appendChild(container);
    };

    const renderDepartmentView = () => {
        const departments = store.get('departments');
        const listContainer = document.createElement('div');
        listContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        
        listContainer.innerHTML = departments.map(dept => `
            <div class="selection-card group relative bg-gray-900/50 p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/30 cursor-pointer overflow-hidden backdrop-blur-lg" 
                 data-id="${dept.id}" data-name="${dept.name}">
                <div class="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div class="relative z-10 flex items-start gap-5">
                    <div class="card-icon flex items-center justify-center w-14 h-14 rounded-xl bg-purple-500/10 text-purple-400 text-2xl border border-white/10">
                        <i class="fas fa-landmark"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="card-title text-lg font-semibold text-white truncate">${dept.name}</h4>
                        <p class="card-subtitle text-sm text-gray-400 mt-1">Click to view all sections</p>
                        <div class="mt-4 flex items-center gap-2">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-800/60 text-gray-300 border border-white/10">
                                <i class="fas fa-chalkboard-teacher mr-1.5 opacity-70"></i>
                                ${store.get('sections').filter(s => s.subjectId?.departmentId?.id === dept.id).length} sections
                            </span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-600 group-hover:text-purple-400 mt-1.5 transition-colors duration-300 transform group-hover:translate-x-1"></i>
                </div>
            </div>
        `).join('') || `<div class="col-span-full text-center py-16">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-gray-700 mb-5">
                <i class="fas fa-folder-open text-3xl text-gray-600"></i>
            </div>
            <h4 class="text-xl font-medium text-white">No Departments Found</h4>
            <p class="text-gray-500 mt-2">Please create departments first to manage fees.</p>
        </div>`;
        
        listContainer.querySelectorAll('.selection-card').forEach(card => {
            card.onclick = () => {
                state.view = 'sections';
                state.selectedDeptId = card.dataset.id;
                state.selectedDeptName = card.dataset.name;
                render();
            };
        });
        return listContainer;
    };

    const renderSectionView = () => {
        const sections = store.get('sections').filter(s => s.subjectId?.departmentId?.id === state.selectedDeptId);
        const listContainer = document.createElement('div');
        listContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        
        listContainer.innerHTML = sections.map(sec => `
            <div class="selection-card group relative bg-gray-900/50 p-6 rounded-2xl border border-white/10 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-900/30 cursor-pointer overflow-hidden backdrop-blur-lg" 
                 data-id="${sec.id}" data-name="${sec.name}">
                <div class="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-green-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div class="relative z-10 flex items-start gap-5">
                    <div class="card-icon flex items-center justify-center w-14 h-14 rounded-xl bg-green-500/10 text-green-400 text-2xl border border-white/10">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="card-title text-lg font-semibold text-white truncate">Section ${sec.name}</h4>
                        <p class="card-subtitle text-sm text-gray-400 mt-1 truncate">Subject: ${sec.subjectId.name}</p>
                        <div class="mt-4 flex flex-wrap items-center gap-2">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-800/60 text-gray-300 border border-white/10">
                                <i class="fas fa-users mr-1.5 opacity-70"></i>
                                ${store.get('students').filter(s => s.sectionId?.id === sec.id).length} students
                            </span>
                             <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-800/60 text-gray-300 border border-white/10">
                                <i class="fas fa-money-bill-wave mr-1.5 opacity-70"></i>
                                ৳ ${store.get('fees').filter(f => {
                                    const studentIds = store.get('students').filter(s => s.sectionId?.id === sec.id).map(s => s.id);
                                    return studentIds.includes(f.studentId?._id || f.studentId);
                                }).reduce((sum, f) => sum + f.amount, 0).toLocaleString('en-BD')}
                            </span>
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-gray-600 group-hover:text-green-400 mt-1.5 transition-colors duration-300 transform group-hover:translate-x-1"></i>
                </div>
            </div>
        `).join('') || `<div class="col-span-full text-center py-16">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-gray-700 mb-5">
                 <i class="fas fa-folder-open text-3xl text-gray-600"></i>
            </div>
            <h4 class="text-xl font-medium text-white">No Sections Found</h4>
            <p class="text-gray-500 mt-2">This department doesn't have any sections yet.</p>
        </div>`;

        listContainer.querySelectorAll('.selection-card').forEach(card => {
            card.onclick = () => {
                state.view = 'students';
                state.selectedSectionId = card.dataset.id;
                state.selectedSectionName = `Section ${card.dataset.name}`;
                render();
            };
        });
        return listContainer;
    };

    const renderStudentListView = () => {
        const studentsInSection = store.get('students').filter(s => s.sectionId?.id === state.selectedSectionId);
        const allFees = store.get('fees');
        
        const studentData = studentsInSection.map(student => ({
            ...student,
            totalFees: allFees.filter(f => (f.studentId?._id === student.id || f.studentId === student.id)).length,
            paidFees: allFees.filter(f => (f.studentId?._id === student.id || f.studentId === student.id) && f.status === 'Paid').length,
            outstandingAmount: allFees.filter(f => (f.studentId?._id === student.id || f.studentId === student.id) && f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0)
        }));

        const searchTerm = state.studentFilter.search.toLowerCase();
        let filteredStudents = studentData.filter(s => 
            s.name.toLowerCase().includes(searchTerm) || 
            s.rollNo.toLowerCase().includes(searchTerm)
        );

        if (state.studentFilter.status !== 'all') {
            filteredStudents = filteredStudents.filter(s => 
                state.studentFilter.status === 'unpaid' ? s.outstandingAmount > 0 : s.outstandingAmount === 0
            );
        }

        filteredStudents.sort((a, b) => {
            if (state.studentFilter.sort === 'name') return a.name.localeCompare(b.name);
            if (state.studentFilter.sort === 'roll') return a.rollNo.localeCompare(b.rollNo);
            if (state.studentFilter.sort === 'due') return b.outstandingAmount - a.outstandingAmount;
            return 0;
        });

        const container = document.createElement('div');
        container.className = 'bg-gray-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-lg shadow-2xl shadow-black/20';
        container.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 class="text-xl font-semibold text-white">Student List</h3>
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
                    <div class="relative w-full sm:w-48">
                        <i class="fas fa-search absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                        <input type="text" id="student-search" class="form-input w-full pl-10 pr-4 py-2.5 bg-gray-800/50" 
                               placeholder="Search students..." value="${state.studentFilter.search}">
                    </div>
                    <select id="status-filter" class="form-input w-full sm:w-auto bg-gray-800/50 py-2.5">
                        <option value="all" ${state.studentFilter.status === 'all' ? 'selected' : ''}>All Students</option>
                        <option value="unpaid" ${state.studentFilter.status === 'unpaid' ? 'selected' : ''}>With Dues</option>
                        <option value="paid" ${state.studentFilter.status === 'paid' ? 'selected' : ''}>No Dues</option>
                    </select>
                    <select id="sort-filter" class="form-input w-full sm:w-auto bg-gray-800/50 py-2.5">
                        <option value="name" ${state.studentFilter.sort === 'name' ? 'selected' : ''}>Sort by Name</option>
                        <option value="roll" ${state.studentFilter.sort === 'roll' ? 'selected' : ''}>Sort by Roll</option>
                        <option value="due" ${state.studentFilter.sort === 'due' ? 'selected' : ''}>Sort by Due Amount</option>
                    </select>
                </div>
            </div>
            <div class="overflow-x-auto custom-scrollbar">
                <table class="min-w-full text-sm">
                    <thead class="border-b-2 border-white/10">
                        <tr class="text-gray-400 font-semibold">
                            <th class="p-4 text-left">Student</th>
                            <th class="p-4 text-left">Roll No</th>
                            <th class="p-4 text-left">Fees Status</th>
                            <th class="p-4 text-left">Outstanding</th>
                            <th class="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/10">
                        ${filteredStudents.length > 0 ? filteredStudents.map(s => `
                            <tr class="hover:bg-gray-800/40 transition-colors duration-300">
                                <td class="p-4">
                                    <div class="flex items-center gap-4">
                                        <img src="${s.profileImage || generateInitialsAvatar(s.name)}" 
                                             class="w-10 h-10 rounded-full object-cover border-2 border-gray-700">
                                        <span class="font-semibold text-white">${s.name}</span>
                                    </div>
                                </td>
                                <td class="p-4 text-gray-300">${s.rollNo}</td>
                                <td class="p-4">
                                    <div class="flex items-center gap-2">
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${s.outstandingAmount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}">
                                            <i class="fas ${s.outstandingAmount > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-1.5"></i>
                                            ${s.paidFees}/${s.totalFees} Paid
                                        </span>
                                    </div>
                                </td>
                                <td class="p-4 font-semibold text-base ${s.outstandingAmount > 0 ? 'text-amber-400' : 'text-green-400'}">
                                    ${formatCurrency(s.outstandingAmount)}
                                </td>
                                <td class="p-4 text-right">
                                    <button class="action-button group relative inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30" 
                                            data-studentid='${JSON.stringify(s)}'>
                                        <i class="fas fa-tasks mr-2 group-hover:scale-110 transition-transform"></i>
                                        Manage Fees
                                    </button>
                                </td>
                              </tr>`).join('') : `
                            <tr>
                                <td colspan="5" class="p-8 text-center">
                                     <div class="text-center py-10">
                                        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-gray-700 mb-5">
                                            <i class="fas fa-user-graduate text-3xl text-gray-600"></i>
                                        </div>
                                        <h4 class="text-xl font-medium text-white">No Students Found</h4>
                                        <p class="text-gray-500 mt-2">${state.studentFilter.search ? 'Your search returned no matching students.' : 'This section has no students assigned to it yet.'}</p>
                                     </div>
                                </td>
                            </tr>`}
                    </tbody>
                </table>
            </div>
            <style>
                .form-input {
                    @apply block w-full rounded-lg border-white/10 bg-gray-800/50 text-white transition duration-300
                           focus:border-purple-500 focus:ring-purple-500/50 focus:ring-2;
                }
            </style>
        `;

        container.querySelector('#student-search').addEventListener('input', (e) => {
            state.studentFilter.search = e.target.value;
            render();
        });

        container.querySelector('#status-filter').addEventListener('change', (e) => {
            state.studentFilter.status = e.target.value;
            render();
        });

        container.querySelector('#sort-filter').addEventListener('change', (e) => {
            state.studentFilter.sort = e.target.value;
            render();
        });

        container.querySelectorAll('.action-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const student = JSON.parse(e.currentTarget.dataset.studentid);
                state.view = 'collect';
                state.selectedStudent = student;
                render();
            });
        });

        return container;
    };

    const renderFeeCollectionForStudent = () => {
        const allFees = store.get('fees');
        const studentFees = allFees.filter(f => 
            (f.studentId?._id === state.selectedStudent.id) || (f.studentId === state.selectedStudent.id)
        ).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));

        const totalDue = studentFees.filter(f => f.status === 'Unpaid').reduce((sum, f) => sum + f.amount, 0);
        const totalPaid = studentFees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0);

        const container = document.createElement('div');
        container.className = 'space-y-6';
        
        container.innerHTML = `
            <!-- Student Summary Card -->
            <div class="bg-gray-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-lg shadow-2xl shadow-black/20">
                <div class="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <img src="${state.selectedStudent.profileImage || generateInitialsAvatar(state.selectedStudent.name)}" 
                         class="w-20 h-20 rounded-full object-cover border-4 border-gray-700/50">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-2xl font-bold text-white">${state.selectedStudent.name}</h3>
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                            <span class="inline-flex items-center text-sm text-gray-300">
                                <i class="fas fa-id-card mr-2 text-gray-500"></i>
                                ${state.selectedStudent.rollNo}
                            </span>
                            <span class="inline-flex items-center text-sm text-gray-300">
                                <i class="fas fa-phone-alt mr-2 text-gray-500"></i>
                                ${state.selectedStudent.phone || 'N/A'}
                            </span>
                             <span class="inline-flex items-center text-sm text-gray-300">
                                <i class="fas fa-envelope mr-2 text-gray-500"></i>
                                ${state.selectedStudent.email || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div class="flex flex-col items-end w-full md:w-auto mt-4 md:mt-0">
                        <div class="text-right bg-gray-800/50 p-4 rounded-lg border border-white/10 w-full">
                            <p class="text-sm text-gray-400">Total Outstanding</p>
                            <p class="text-3xl font-bold ${totalDue > 0 ? 'text-amber-400' : 'text-green-400'}">${formatCurrency(totalDue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fee Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div class="summary-card border-purple-500/20 hover:border-purple-500/50">
                    <div class="summary-card-icon bg-purple-500/10 text-purple-400">
                        <i class="fas fa-file-invoice-dollar"></i>
                    </div>
                    <div>
                        <p class="summary-card-label">Total Fees</p>
                        <p class="summary-card-value">${formatCurrency(totalDue + totalPaid)}</p>
                    </div>
                </div>
                
                <div class="summary-card border-amber-500/20 hover:border-amber-500/50">
                    <div class="summary-card-icon bg-amber-500/10 text-amber-400">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <p class="summary-card-label">Outstanding</p>
                        <p class="summary-card-value">${formatCurrency(totalDue)}</p>
                    </div>
                    ${totalDue > 0 ? `
                    <button class="absolute bottom-4 right-4 text-xs bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 hover:text-white px-3 py-1.5 rounded-md transition-all font-semibold collect-all-btn">
                        <i class="fas fa-money-bill-wave mr-1"></i>
                        Collect All
                    </button>` : ''}
                </div>
                
                <div class="summary-card border-green-500/20 hover:border-green-500/50">
                    <div class="summary-card-icon bg-green-500/10 text-green-400">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div>
                        <p class="summary-card-label">Total Paid</p>
                        <p class="summary-card-value">${formatCurrency(totalPaid)}</p>
                    </div>
                </div>
            </div>

            <!-- Fee Management Section -->
            <div class="bg-gray-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-lg">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 class="text-xl font-semibold text-white">Fee Records</h3>
                    <div class="flex items-center gap-3">
                        <button class="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30 add-fee-btn">
                            <i class="fas fa-plus-circle mr-2"></i>
                            Add New Fee
                        </button>
                        <div class="relative">
                            <i class="fas fa-filter absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
                            <select id="fee-status-filter" class="form-input pl-10 pr-4 py-2.5 bg-gray-800/50 text-sm">
                                <option value="all" ${state.feeFilter.status === 'all' ? 'selected' : ''}>All Status</option>
                                <option value="Paid" ${state.feeFilter.status === 'Paid' ? 'selected' : ''}>Paid Only</option>
                                <option value="Unpaid" ${state.feeFilter.status === 'Unpaid' ? 'selected' : ''}>Unpaid Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto custom-scrollbar">
                    <table class="min-w-full text-sm">
                        <thead class="border-b-2 border-white/10">
                            <tr class="text-gray-400 font-semibold">
                                <th class="p-4 text-left">Fee Type</th>
                                <th class="p-4 text-left">Due Date</th>
                                <th class="p-4 text-left">Status</th>
                                <th class="p-4 text-left">Amount</th>
                                <th class="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/10">
                            ${studentFees.length > 0 ? studentFees.filter(fee => 
                                state.feeFilter.status === 'all' || fee.status === state.feeFilter.status
                            ).map(fee => {
                                const isUnpaid = fee.status === 'Unpaid';
                                return `
                                <tr class="hover:bg-gray-800/40 transition-colors duration-300">
                                    <td class="p-4 font-medium text-white">${fee.feeType}</td>
                                    <td class="p-4 text-gray-300">${formatDate(fee.dueDate)}</td>
                                    <td class="p-4">
                                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${isUnpaid ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}">
                                            <i class="fas ${isUnpaid ? 'fa-exclamation-triangle' : 'fa-check-circle'} mr-1.5"></i>
                                            ${fee.status}
                                        </span>
                                    </td>
                                    <td class="p-4 font-semibold text-base ${isUnpaid ? 'text-amber-400' : 'text-green-400'}">${formatCurrency(fee.amount)}</td>
                                    <td class="p-4 text-right">
                                        <div class="flex items-center justify-end gap-2">
                                            ${isUnpaid ? `
                                            <button class="action-button-collect inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all duration-300 hover:shadow-md hover:shadow-amber-500/20" 
                                                    data-feeid="${fee.id}">
                                                <i class="fas fa-money-bill-wave mr-1"></i>
                                                Collect
                                            </button>` : `
                                            <button class="action-button-receipt inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-gray-700/50 hover:bg-gray-700/80 border border-white/10 text-gray-300 hover:text-white transition-all" 
                                                    data-feeid="${fee.id}">
                                                <i class="fas fa-receipt mr-1"></i>
                                                Receipt
                                            </button>`}
                                            <button class="action-button-edit inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium bg-gray-700/50 hover:bg-gray-700/80 border border-white/10 text-gray-300 hover:text-white transition-all" 
                                                    data-feeid="${fee.id}">
                                                <i class="fas fa-pencil-alt"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('') : `
                                <tr>
                                     <td colspan="5" class="p-8 text-center">
                                        <div class="text-center py-10">
                                            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-gray-700 mb-5">
                                                <i class="fas fa-file-invoice text-3xl text-gray-600"></i>
                                            </div>
                                            <h4 class="text-xl font-medium text-white">No Fee Records</h4>
                                            <p class="text-gray-500 mt-2">This student has no fee records assigned yet.</p>
                                        </div>
                                    </td>
                                </tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Payment History -->
            <div class="bg-gray-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-lg">
                <h3 class="text-xl font-semibold text-white mb-6">Payment History</h3>
                <div class="space-y-4">
                    ${studentFees.filter(f => f.status === 'Paid').length > 0 ? 
                        studentFees.filter(f => f.status === 'Paid')
                            .sort((a, b) => new Date(b.paidDate) - new Date(a.paidDate))
                            .map(fee => `
                            <div class="payment-history-item bg-gray-800/40 p-4 rounded-lg border border-white/10 hover:border-green-500/30 transition-all">
                                <div class="flex items-start justify-between gap-4">
                                    <div class="flex items-start gap-4">
                                        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center">
                                            <i class="fas fa-check"></i>
                                        </div>
                                        <div>
                                            <h4 class="font-medium text-white">${fee.feeType}</h4>
                                            <p class="text-sm text-gray-400 mt-1">
                                                <span class="mr-4"><i class="fas fa-calendar-day mr-1.5 opacity-60"></i> ${formatDate(fee.paidDate)}</span>
                                                <span><i class="fas fa-user-tie mr-1.5 opacity-60"></i> Collected by ${fee.collectedBy?.name || 'Admin'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-lg font-semibold text-green-400">${formatCurrency(fee.amount)}</p>
                                        <button class="mt-1 text-xs bg-gray-700/50 hover:bg-gray-700/80 border border-white/10 text-gray-300 hover:text-white px-3 py-1.5 rounded-md transition-all print-receipt-btn" data-feeid="${fee.id}">
                                            <i class="fas fa-print mr-1"></i>
                                            Print
                                        </button>
                                    </div>
                                </div>
                            </div>`).join('') : `
                            <div class="text-center py-12">
                                 <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 border-2 border-dashed border-gray-700 mb-5">
                                    <i class="fas fa-history text-3xl text-gray-600"></i>
                                </div>
                                <h4 class="text-xl font-medium text-white">No Payment History</h4>
                                <p class="text-gray-500 mt-2">This student has not made any payments yet.</p>
                            </div>`}
                </div>
            </div>
            <style>
                 .summary-card {
                    @apply relative p-6 rounded-2xl overflow-hidden transition-all duration-300 bg-gray-900/50 border backdrop-blur-lg;
                    box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.2);
                }
                .summary-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 8px 30px -7px rgba(0, 0, 0, 0.3);
                }
                .summary-card-icon {
                    @apply w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-4;
                }
                .summary-card-label {
                    @apply text-sm text-gray-400 font-medium;
                }
                .summary-card-value {
                    @apply text-3xl font-bold text-white mt-1;
                }
                .form-input {
                    @apply block w-full rounded-lg border-white/10 bg-gray-800/50 text-white transition duration-300
                           focus:border-purple-500 focus:ring-purple-500/50 focus:ring-2;
                }
            </style>
        `;

        container.querySelector('#fee-status-filter').addEventListener('change', (e) => {
            state.feeFilter.status = e.target.value;
            render();
        });

        container.querySelector('.add-fee-btn')?.addEventListener('click', () => {
            showAddFeeModal();
        });

        container.querySelector('.collect-all-btn')?.addEventListener('click', () => {
            showCollectAllModal();
        });

        container.querySelectorAll('.action-button-collect').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feeId = e.currentTarget.dataset.feeid;
                showPaymentModal(feeId);
            });
        });

        container.querySelectorAll('.action-button-receipt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feeId = e.currentTarget.dataset.feeid;
                showReceiptModal(feeId);
            });
        });

        container.querySelectorAll('.action-button-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feeId = e.currentTarget.dataset.feeid;
                showEditFeeModal(feeId);
            });
        });

        container.querySelectorAll('.print-receipt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const feeId = e.currentTarget.dataset.feeid;
                printReceipt(feeId);
            });
        });

        return container;
    };

    // Helper functions for modals
    const showAddFeeModal = () => {
        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <div class="bg-gray-900/80 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl animate-modal-in">
                    <div class="p-6 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xl font-bold text-white">Add New Fee</h3>
                            <button class="close-modal text-gray-400 hover:text-white transition-colors h-8 w-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <p class="text-gray-400 mt-1">Create a new fee record for ${state.selectedStudent.name}</p>
                    </div>
                    <form class="p-6 space-y-4" onsubmit="return false;">
                        <div>
                            <label for="fee-type" class="block text-sm font-medium text-gray-300 mb-2">Fee Type</label>
                            <select id="fee-type" class="form-input w-full bg-gray-800/50">
                                <option>Tuition Fee</option> <option>Exam Fee</option> <option>Library Fee</option>
                                <option>Lab Fee</option> <option>Transportation Fee</option> <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label for="fee-amount" class="block text-sm font-medium text-gray-300 mb-2">Amount (BDT)</label>
                            <input type="number" id="fee-amount" class="form-input w-full bg-gray-800/50" placeholder="e.g., 5000">
                        </div>
                        <div>
                            <label for="fee-due-date" class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                            <input type="date" id="fee-due-date" class="form-input w-full bg-gray-800/50">
                        </div>
                        <div>
                            <label for="fee-description" class="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                            <textarea id="fee-description" rows="3" class="form-input w-full bg-gray-800/50" placeholder="Any additional details..."></textarea>
                        </div>
                        <div class="pt-4">
                            <button class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 add-fee-submit">
                                <i class="fas fa-save mr-2"></i>
                                Save Fee Record
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style>
            .form-input {
                @apply block w-full rounded-lg border-white/10 bg-gray-800/50 text-white transition duration-300
                        focus:border-purple-500 focus:ring-purple-500/50 focus:ring-2;
            }
            @keyframes modal-in {
                from { opacity: 0; transform: scale(0.95) translateY(10px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-modal-in {
                animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            </style>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);

        const today = new Date();
        today.setDate(today.getDate() + 7);
        const nextWeek = today.toISOString().split('T')[0];
        modal.querySelector('#fee-due-date').value = nextWeek;

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('.add-fee-submit').addEventListener('click', async () => {
            const feeData = {
                studentId: state.selectedStudent.id,
                feeType: modal.querySelector('#fee-type').value,
                amount: Number(modal.querySelector('#fee-amount').value),
                dueDate: modal.querySelector('#fee-due-date').value,
                description: modal.querySelector('#fee-description').value,
                status: 'Unpaid'
            };

            if (!feeData.amount || isNaN(feeData.amount) || feeData.amount <= 0) {
                showToast('Please enter a valid, positive amount', 'error');
                return;
            }

            // --- FIX: Using apiService directly instead of store.create ---
            try {
                if (await apiService.create('fees', feeData)) {
                    await store.refresh('fees');
                    showToast('Fee record added successfully', 'success');
                    modal.remove();
                    render();
                } else {
                    throw new Error("API call failed silently.");
                }
            } catch (error) {
                showToast('Failed to add fee record', 'error');
                console.error(error);
            }
        });
    };

    const showCollectAllModal = () => {
        const unpaidFees = store.get('fees').filter(f => 
            (f.studentId?._id === state.selectedStudent.id || f.studentId === state.selectedStudent.id) && 
            f.status === 'Unpaid'
        );
        const totalAmount = unpaidFees.reduce((sum, f) => sum + f.amount, 0);

        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                 <div class="bg-gray-900/80 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl animate-modal-in">
                    <div class="p-6 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xl font-bold text-white">Collect All Outstanding Fees</h3>
                            <button class="close-modal text-gray-400 hover:text-white transition-colors h-8 w-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <p class="text-gray-400 mt-1">Complete payment for all unpaid fees.</p>
                    </div>
                    <div class="p-6 space-y-5">
                         <div class="bg-gray-800/50 p-4 rounded-lg border border-white/10 text-center">
                            <p class="text-gray-400 text-sm">Total to be collected</p>
                            <p class="text-3xl font-bold text-white">${formatCurrency(totalAmount)}</p>
                            <p class="text-gray-500 text-sm mt-1">for ${unpaidFees.length} unpaid record(s)</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                            <div class="grid grid-cols-3 gap-3">
                                <button class="payment-method-btn active">
                                    <i class="fas fa-money-bill-wave text-green-400"></i><span>Cash</span>
                                </button>
                                <button class="payment-method-btn">
                                    <i class="fab fa-cc-visa text-indigo-400"></i><span>Card</span>
                                </button>
                                <button class="payment-method-btn">
                                    <i class="fas fa-mobile-alt text-purple-400"></i><span>Mobile</span>
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Payment Date</label>
                            <input type="date" id="payment-date" class="form-input w-full bg-gray-800/50" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="pt-4">
                            <button class="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/30 confirm-collect-all">
                                <i class="fas fa-check-circle mr-2"></i>
                                Confirm Collection
                            </button>
                        </div>
                    </div>
                </div>
            </div>
             <style>
                .payment-method-btn { @apply flex flex-col items-center justify-center p-4 rounded-lg border border-white/10 bg-gray-800/50 hover:bg-gray-700/70 transition-all duration-300; }
                .payment-method-btn.active { @apply border-purple-500/80 bg-purple-600/20 ring-2 ring-purple-500/50; }
                .payment-method-btn i { @apply text-2xl mb-1.5; }
                .payment-method-btn span { @apply text-xs text-gray-300; }
                .form-input { @apply block w-full rounded-lg border-white/10 bg-gray-800/50 text-white transition duration-300 focus:border-purple-500 focus:ring-purple-500/50 focus:ring-2; }
                @keyframes modal-in {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-modal-in { animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            </style>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);

        modal.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelector('.payment-method-btn.active').classList.remove('active');
                btn.classList.add('active');
            });
        });

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('.confirm-collect-all').addEventListener('click', async () => {
            const paymentData = {
                paidDate: modal.querySelector('#payment-date').value,
                paymentMethod: modal.querySelector('.payment-method-btn.active span').textContent,
                collectedBy: currentUser.id
            };
            
            // --- FIX: Using apiService in a loop ---
            try {
                const updatePromises = unpaidFees.map(fee => 
                    apiService.update('fees', fee.id, {
                        status: 'Paid',
                        paidDate: paymentData.paidDate,
                        paymentMethod: paymentData.paymentMethod,
                        collectedBy: currentUser
                    })
                );
                
                await Promise.all(updatePromises);
                await store.refresh('fees');
                showToast(`Successfully collected ${unpaidFees.length} fees`, 'success');
                modal.remove();
                render();
            } catch (error) {
                showToast('Failed to collect fees', 'error');
                console.error(error);
            }
        });
    };

    const showPaymentModal = (feeId) => {
        const fee = store.get('fees').find(f => f.id === feeId);
        if (!fee) return;

        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                 <div class="bg-gray-900/80 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl animate-modal-in">
                    <div class="p-6 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xl font-bold text-white">Collect Fee Payment</h3>
                             <button class="close-modal text-gray-400 hover:text-white transition-colors h-8 w-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <p class="text-gray-400 mt-1">Record payment for ${fee.feeType}</p>
                    </div>
                    <div class="p-6 space-y-5">
                         <div class="bg-gray-800/50 p-4 rounded-lg border border-white/10 text-center">
                            <p class="text-gray-400 text-sm">Amount to collect</p>
                            <p class="text-3xl font-bold text-white">${formatCurrency(fee.amount)}</p>
                            <p class="text-gray-500 text-sm mt-1">Due: ${formatDate(fee.dueDate)}</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                            <div class="grid grid-cols-3 gap-3">
                                <button class="payment-method-btn active"><i class="fas fa-money-bill-wave text-green-400"></i><span>Cash</span></button>
                                <button class="payment-method-btn"><i class="fab fa-cc-visa text-indigo-400"></i><span>Card</span></button>
                                <button class="payment-method-btn"><i class="fas fa-mobile-alt text-purple-400"></i><span>Mobile</span></button>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Payment Date</label>
                            <input type="date" id="payment-date" class="form-input w-full bg-gray-800/50" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="pt-4">
                            <button class="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/30 confirm-payment" data-feeid="${feeId}">
                                <i class="fas fa-check-circle mr-2"></i>
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .payment-method-btn { @apply flex flex-col items-center justify-center p-4 rounded-lg border border-white/10 bg-gray-800/50 hover:bg-gray-700/70 transition-all duration-300; }
                .payment-method-btn.active { @apply border-purple-500/80 bg-purple-600/20 ring-2 ring-purple-500/50; }
                .payment-method-btn i { @apply text-2xl mb-1.5; }
                .payment-method-btn span { @apply text-xs text-gray-300; }
                .form-input { @apply block w-full rounded-lg border-white/10 bg-gray-800/50 text-white transition duration-300 focus:border-purple-500 focus:ring-purple-500/50 focus:ring-2; }
                @keyframes modal-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modal-in { animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            </style>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);

        modal.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelector('.payment-method-btn.active').classList.remove('active');
                btn.classList.add('active');
            });
        });

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('.confirm-payment').addEventListener('click', async () => {
            const paymentData = {
                status: 'Paid',
                paidDate: modal.querySelector('#payment-date').value,
                paymentMethod: modal.querySelector('.payment-method-btn.active span').textContent,
                collectedBy: currentUser
            };

            // --- FIX: Using apiService directly ---
            try {
                if(await apiService.update('fees', feeId, paymentData)) {
                    await store.refresh('fees');
                    showToast('Payment recorded successfully', 'success');
                    modal.remove();
                    render();
                } else {
                    throw new Error("API call failed silently.");
                }
            } catch (error) {
                showToast('Failed to record payment', 'error');
                console.error(error);
            }
        });
    };

    const showReceiptModal = (feeId) => {
        const fee = store.get('fees').find(f => f.id === feeId);
        if (!fee) return;

        const modalHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                 <div class="bg-gray-900/80 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl animate-modal-in">
                    <div class="p-6 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xl font-bold text-white">Payment Receipt</h3>
                             <button class="close-modal text-gray-400 hover:text-white transition-colors h-8 w-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <p class="text-gray-400 mt-1">Details for ${fee.feeType}</p>
                    </div>
                    <div class="p-6 space-y-4">
                        <div class="bg-white p-8 rounded-lg text-gray-800" id="receipt-content">
                            <div class="text-center mb-8">
                                <h4 class="text-2xl font-bold">${store.get('institution')?.name || 'Educational Institution'}</h4>
                                <p class="text-sm text-gray-500">Official Payment Receipt</p>
                            </div>
                            
                            <div class="flex justify-between items-start mb-8">
                                <div>
                                    <p class="font-semibold text-gray-600 text-sm">BILLED TO</p>
                                    <p class="font-bold text-lg">${state.selectedStudent.name}</p>
                                    <p class="text-sm text-gray-600">Roll: ${state.selectedStudent.rollNo}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-semibold text-gray-600 text-sm">RECEIPT</p>
                                    <p class="font-bold text-lg">#${fee.id.slice(0, 8).toUpperCase()}</p>
                                    <p class="text-sm text-gray-600">Date: ${formatDate(fee.paidDate)}</p>
                                </div>
                            </div>
                            
                            <table class="w-full mb-8">
                                <thead class="bg-gray-50">
                                    <tr class="border-b-2 border-gray-200">
                                        <th class="text-left p-3 font-semibold text-gray-600">DESCRIPTION</th>
                                        <th class="text-right p-3 font-semibold text-gray-600">AMOUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="border-b border-gray-100">
                                        <td class="p-3">${fee.feeType}</td>
                                        <td class="p-3 text-right">${formatCurrency(fee.amount)}</td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr class="font-bold">
                                        <td class="p-3 text-right">TOTAL PAID</td>
                                        <td class="p-3 text-right text-xl">${formatCurrency(fee.amount)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                            
                             <div class="flex justify-between items-start text-sm text-gray-600">
                                <div>
                                    <p class="font-semibold">Payment Method:</p>
                                    <p>${fee.paymentMethod || 'Cash'}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-semibold">Collected By:</p>
                                    <p>${fee.collectedBy?.name || currentUser.name}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-center gap-4 pt-4">
                            <button class="print-receipt inline-flex items-center px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30" data-feeid="${feeId}">
                                <i class="fas fa-print mr-2"></i>
                                Print
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes modal-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modal-in { animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            </style>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        modal.querySelector('.print-receipt').addEventListener('click', () => { printReceipt(feeId); });
    };

    const showEditFeeModal = (feeId) => {
        const fee = store.get('fees').find(f => f.id === feeId);
        if (!fee) return;

        const modalHTML = `
             <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                 <div class="bg-gray-900/80 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/40 backdrop-blur-xl animate-modal-in">
                    <div class="p-6 border-b border-white/10">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xl font-bold text-white">Edit Fee Record</h3>
                             <button class="close-modal text-gray-400 hover:text-white transition-colors h-8 w-8 rounded-full hover:bg-gray-700/50 flex items-center justify-center">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <p class="text-gray-400 mt-1">Update fee details for ${state.selectedStudent.name}</p>
                    </div>
                    <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Fee Type</label>
                            <select id="fee-type" class="form-input w-full bg-gray-800/50">
                                <option ${fee.feeType === 'Tuition Fee' ? 'selected' : ''}>Tuition Fee</option>
                                <option ${fee.feeType === 'Exam Fee' ? 'selected' : ''}>Exam Fee</option>
                                <option ${fee.feeType === 'Library Fee' ? 'selected' : ''}>Library Fee</option>
                                <option ${fee.feeType === 'Lab Fee' ? 'selected' : ''}>Lab Fee</option>
                                <option ${fee.feeType === 'Transportation Fee' ? 'selected' : ''}>Transportation Fee</option>
                                <option ${fee.feeType === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Amount (BDT)</label>
                            <input type="number" id="fee-amount" class="form-input w-full bg-gray-800/50" value="${fee.amount}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                            <input type="date" id="fee-due-date" class="form-input w-full bg-gray-800/50" value="${fee.dueDate.split('T')[0]}">
                        </div>
                        ${fee.status === 'Paid' ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Paid Date</label>
                            <input type="date" id="fee-paid-date" class="form-input w-full bg-gray-800/50" value="${fee.paidDate?.split('T')[0] || ''}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                            <select id="payment-method" class="form-input w-full bg-gray-800/50">
                                <option ${fee.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                                <option ${fee.paymentMethod === 'Card' ? 'selected' : ''}>Card</option>
                                <option ${fee.paymentMethod === 'Mobile' ? 'selected' : ''}>Mobile</option>
                            </select>
                        </div>` : ''}
                        <div class="pt-4 flex items-center justify-between gap-4">
                            <button class="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-red-500/30 delete-fee" data-feeid="${feeId}">
                                <i class="fas fa-trash-alt mr-2"></i>Delete
                            </button>
                            <button class="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 save-fee" data-feeid="${feeId}">
                                <i class="fas fa-save mr-2"></i>Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                .form-input { @apply block w-full rounded-lg border-white/10 bg-gray-800/50 text-white transition duration-300 focus:border-purple-500 focus:ring-purple-500/50 focus:ring-2; }
                @keyframes modal-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modal-in { animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            </style>
        `;

        const modal = document.createElement('div');
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);

        modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        modal.querySelector('.save-fee').addEventListener('click', async () => {
            const feeData = {
                feeType: modal.querySelector('#fee-type').value,
                amount: Number(modal.querySelector('#fee-amount').value),
                dueDate: modal.querySelector('#fee-due-date').value,
            };

            if (fee.status === 'Paid') {
                feeData.paidDate = modal.querySelector('#fee-paid-date').value;
                feeData.paymentMethod = modal.querySelector('#payment-method').value;
            }

            if (!feeData.amount || isNaN(feeData.amount) || feeData.amount <= 0) {
                showToast('Please enter a valid, positive amount', 'error');
                return;
            }

            // --- FIX: Using apiService directly ---
            try {
                if (await apiService.update('fees', feeId, feeData)) {
                    await store.refresh('fees');
                    showToast('Fee record updated successfully', 'success');
                    modal.remove();
                    render();
                } else {
                     throw new Error("API call failed silently.");
                }
            } catch (error) {
                showToast('Failed to update fee record', 'error');
                console.error(error);
            }
        });

        modal.querySelector('.delete-fee').addEventListener('click', async () => {
            if (!confirm('Are you sure you want to permanently delete this fee record? This action cannot be undone.')) {
                return;
            }

            // --- FIX: Using apiService directly ---
            try {
                if (await apiService.remove('fees', feeId)) {
                    await store.refresh('fees');
                    showToast('Fee record deleted successfully', 'success');
                    modal.remove();
                    render();
                } else {
                    throw new Error("API call failed silently.");
                }
            } catch (error)
            {
                showToast('Failed to delete fee record', 'error');
                console.error(error);
            }
        });
    };

    const printReceipt = (feeId) => {
        const fee = store.get('fees').find(f => f.id === feeId);
        if (!fee || fee.status !== 'Paid') {
            showToast('Cannot print receipt for unpaid or invalid fee', 'error');
            return;
        };

        const receiptContent = document.getElementById('receipt-content')?.innerHTML;
        const printWindow = window.open('', '', 'width=800,height=600');
        
        if (receiptContent) {
            printWindow.document.write(`
                <!DOCTYPE html><html><head><title>Print Receipt</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>body { font-family: sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }</style>
                </head><body>${receiptContent}</body></html>`);
        } else {
             // Fallback for direct print
            printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Payment Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 20px; }
                .receipt-container { max-width: 700px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { font-size: 24px; margin-bottom: 5px; } .header p { font-size: 14px; color: #666; }
                .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                th { background-color: #f9f9f9; font-weight: 600; }
                .total-row { font-weight: bold; font-size: 1.1em; }
                .footer { margin-top: 40px; color: #555; }
            </style>
            </head><body><div class="receipt-container">
                <div class="header">
                    <h1>${store.get('institution')?.name || 'Educational Institution'}</h1><p>Payment Receipt</p>
                </div>
                <div class="details">
                    <div>
                        <p><strong>Student:</strong> ${state.selectedStudent.name}</p>
                        <p><strong>Roll:</strong> ${state.selectedStudent.rollNo}</p>
                    </div>
                    <div>
                        <p><strong>Receipt No:</strong> #${fee.id.slice(0, 8).toUpperCase()}</p>
                        <p><strong>Date:</strong> ${formatDate(fee.paidDate)}</p>
                    </div>
                </div>
                <table><thead><tr><th>Description</th><th style="text-align: right;">Amount</th></tr></thead><tbody>
                    <tr><td>${fee.feeType}</td><td style="text-align: right;">${formatCurrency(fee.amount)}</td></tr>
                    <tr class="total-row"><td style="text-align: right;">Total Paid</td><td style="text-align: right;">${formatCurrency(fee.amount)}</td></tr>
                </tbody></table>
                <div class="footer">
                    <p><strong>Payment Method:</strong> ${fee.paymentMethod || 'Cash'}</p>
                    <p><strong>Collected By:</strong> ${fee.collectedBy?.name || currentUser.name}</p>
                </div>
            </div></body></html>`);
        }
        
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const generateInitialsAvatar = (name = 'User') => {
        const initials = (name.split(' ').map(part => part[0]).join('') || 'U').toUpperCase().slice(0, 2);
        const colors = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];
        const colorIndex = (name.charCodeAt(0) || 0) % colors.length;
        const bgColor = colors[colorIndex];
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${bgColor}"/><text x="50" y="55" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="600">${initials}</text></svg>`)}`;
    };

    const getSkeletonLoaderHTML = (type) => {
        if (type === 'dashboard') {
            return `
                <div class="animate-pulse space-y-8">
                    <div class="h-28 bg-gray-800/50 rounded-2xl"></div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="h-40 bg-gray-800/50 rounded-2xl"></div>
                        <div class="h-40 bg-gray-800/50 rounded-2xl"></div>
                        <div class="h-40 bg-gray-800/50 rounded-2xl"></div>
                    </div>
                    <div class="h-96 bg-gray-800/50 rounded-2xl"></div>
                </div>`;
        }
        return '<div class="h-64 bg-gray-800/50 rounded-2xl animate-pulse"></div>';
    };

    await render();
}