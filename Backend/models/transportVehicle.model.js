// models/transportVehicle.model.js
const mongoose = require('mongoose');

const transportVehicleSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true, unique: true },
    driverName: { type: String, required: true },
    driverContact: { type: String },
    capacity: { type: Number, required: true },
}, { timestamps: true });

transportVehicleSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.vehicleId = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('TransportVehicle', transportVehicleSchema);