// models/reservation.model.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Fulfilled', 'Cancelled'], default: 'Pending' },
}, { timestamps: true });

reservationSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.reservationId = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('Reservation', reservationSchema);