// models/transportAssignment.model.js
const mongoose = require('mongoose');

const transportAssignmentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportVehicle', required: true },
}, { timestamps: true });

transportAssignmentSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.assignmentId = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('TransportAssignment', transportAssignmentSchema);