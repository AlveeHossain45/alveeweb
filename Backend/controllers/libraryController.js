const asyncHandler = require('express-async-handler');
const Book = require('../models/book.model.js');
const LibraryTransaction = require('../models/libraryTransaction.model.js');
const Reservation = require('../models/reservation.model.js');
const ReadingList = require('../models/readingList.model.js');
const Acquisition = require('../models/acquisition.model.js');
const Fee = require('../models/fee.model.js');

// @desc    Get all library data in one go
// @route   GET /library
// @access  Private
const getLibraryData = asyncHandler(async (req, res) => {
    // This is an alternative to separate calls, can be more efficient.
    const [books, transactions, reservations, readingLists, acquisitions] = await Promise.all([
        Book.find({}),
        LibraryTransaction.find({}).sort({ issueDate: -1 }),
        Reservation.find({}).sort({ requestDate: -1 }),
        ReadingList.find({}),
        Acquisition.find({}).sort({ acquiredDate: -1 }),
    ]);

    res.json({ books, transactions, reservations, readingLists, acquisitions });
});


// === BOOKS ===
const getAllBooks = asyncHandler(async (req, res) => {
    res.json(await Book.find({}));
});
const createBook = asyncHandler(async (req, res) => {
    res.status(201).json(await Book.create(req.body));
});
const updateBook = asyncHandler(async (req, res) => {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!book) { res.status(404); throw new Error('Book not found'); }
    res.json(book);
});
const deleteBook = asyncHandler(async (req, res) => {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) { res.status(404); throw new Error('Book not found'); }
    res.json({ message: 'Book deleted' });
});


// === TRANSACTIONS (Borrows/Returns) ===
const getAllTransactions = asyncHandler(async (req, res) => {
    res.json(await LibraryTransaction.find({}).sort({ issueDate: -1 }));
});
// in controllers/libraryController.js
const createTransaction = asyncHandler(async (req, res) => { // Issue a book
    // Step 1: Destructure the required fields from the request body. THIS IS THE FIX.
    const { bookId, memberId, dueDate } = req.body;

    // Step 2: Add validation to ensure all data was sent from the frontend.
    if (!bookId || !memberId || !dueDate) {
        res.status(400);
        throw new Error('Book ID, Member ID, and Due Date are required to issue a book.');
    }

    // Step 3: Use an atomic operation to find a book and decrement its available copies in one go.
    // This prevents race conditions where two people could try to borrow the last copy at the same time.
    const book = await Book.findOneAndUpdate(
        { _id: bookId, availableCopies: { $gt: 0 } }, // Condition: Find the book AND ensure copies are available.
        { $inc: { availableCopies: -1 } }, // The atomic update operation.
        { new: true } // Option to return the document *after* the update.
    );

    // Step 4: Check if the book update was successful.
    if (book) {
        // If the book was found and updated, it's safe to create the transaction record.
        const transaction = await LibraryTransaction.create({
            bookId,
            memberId,
            dueDate,
            status: 'Issued' // The status is always 'Issued' on creation.
        });
        res.status(201).json(transaction);
    } else {
        // If 'book' is null, it means the findOneAndUpdate operation failed,
        // either because the book doesn't exist or because availableCopies was 0.
        res.status(400);
        throw new Error('Book is not available for issue or does not exist.');
    }
});
const updateTransaction = asyncHandler(async (req, res) => { // Return a book
const transaction = await LibraryTransaction.findById(req.params.id);
if (transaction && transaction.status === 'Issued') {
    await Book.updateOne({ _id: transaction.bookId }, { $inc: { availableCopies: 1 } });
}

      
const updatedTransaction = await LibraryTransaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedTransaction) { res.status(404); throw new Error('Transaction not found'); }
    res.json(updatedTransaction);
});


// === RESERVATIONS ===
const getAllReservations = asyncHandler(async (req, res) => {
    res.json(await Reservation.find({}).sort({ requestDate: -1 }));
});
const createReservation = asyncHandler(async (req, res) => {
    res.status(201).json(await Reservation.create(req.body));
});
const updateReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reservation) { res.status(404); throw new Error('Reservation not found'); }
    res.json(reservation);
});
const deleteReservation = asyncHandler(async (req, res) => {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) { res.status(404); throw new Error('Reservation not found'); }
    res.json({ success: true, message: 'Reservation cancelled' });
});


// === ACQUISITIONS ===
const getAllAcquisitions = asyncHandler(async (req, res) => {
    res.json(await Acquisition.find({}).sort({ acquiredDate: -1 }));
});
const createAcquisition = asyncHandler(async (req, res) => {
    res.status(201).json(await Acquisition.create(req.body));
});


// === READING LISTS ===
const getAllReadingLists = asyncHandler(async (req, res) => {
    res.json(await ReadingList.find({}));
});
const createReadingList = asyncHandler(async (req, res) => {
    res.status(201).json(await ReadingList.create(req.body));
});
const updateReadingList = asyncHandler(async (req, res) => {
    const list = await ReadingList.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!list) { res.status(404); throw new Error('Reading List not found'); }
    res.json(list);
});
const deleteReadingList = asyncHandler(async (req, res) => {
    const list = await ReadingList.findByIdAndDelete(req.params.id);
    if (!list) { res.status(404); throw new Error('Reading List not found'); }
    res.json({ message: 'Reading list deleted' });
});


module.exports = {
    getLibraryData,
    getAllBooks,
    createBook,
    updateBook,
    deleteBook,
    getAllTransactions,
    createTransaction,
    updateTransaction,
    getAllReservations,
    createReservation,
    updateReservation,
    deleteReservation,
    getAllAcquisitions,
    createAcquisition,
    getAllReadingLists,
    createReadingList,
    updateReadingList,
    deleteReadingList,
};