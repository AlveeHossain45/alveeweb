// models/transportRoute.model.js
const mongoose = require('mongoose');

const transportRouteSchema = new mongoose.Schema({
    routeName: { type: String, required: true },
    vehicleNumber: { type: String, required: true },
    driverName: { type: String, required: true },
    driverContact: { type: String },
    capacity: { type: Number, required: true, default: 40 },
    stops: [{ type: String }],
    startTime: { type: String, required: true }, // e.g., "07:00 AM"
}, { timestamps: true });

transportRouteSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('TransportRoute', transportRouteSchema);