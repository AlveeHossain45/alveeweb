// routes/library.routes.js
const express = require('express');
const router = express.Router();
const {
    getLibraryData,
    getAllBooks, createBook, updateBook, deleteBook,
    getAllTransactions, createTransaction, updateTransaction,
    getAllReservations, createReservation, updateReservation, deleteReservation,
    getAllAcquisitions, createAcquisition,
    getAllReadingLists, createReadingList, updateReadingList, deleteReadingList,
} = require('../controllers/libraryController');

router.get('/', getLibraryData);

router.route('/books').get(getAllBooks).post(createBook);
router.route('/books/:id').put(updateBook).delete(deleteBook);

router.route('/transactions').get(getAllTransactions).post(createTransaction);
router.put('/transactions/:id', updateTransaction);

router.route('/reservations').get(getAllReservations).post(createReservation);
router.route('/reservations/:id').put(updateReservation).delete(deleteReservation);

router.route('/acquisitions').get(getAllAcquisitions).post(createAcquisition);

router.route('/readingLists').get(getAllReadingLists).post(createReadingList);
router.route('/readingLists/:id').put(updateReadingList).delete(deleteReadingList);

module.exports = router;