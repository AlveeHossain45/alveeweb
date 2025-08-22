// controllers/transportController.js
const asyncHandler = require('express-async-handler');
const TransportRoute = require('../models/transportRoute.model.js');

// @desc    Get all transport routes
// @route   GET /transport
// @access  Private
const getRoutes = asyncHandler(async (req, res) => {
    const routes = await TransportRoute.find({});
    res.json(routes);
});

// @desc    Create a new transport route
// @route   POST /transport
// @access  Private (Admin)
const createRoute = asyncHandler(async (req, res) => {
    const { routeName, vehicleNumber, driverName, startTime } = req.body;
    if (!routeName || !vehicleNumber || !driverName || !startTime) {
        res.status(400);
        throw new Error('Route Name, Vehicle No., Driver Name, and Start Time are required.');
    }
    const route = await TransportRoute.create(req.body);
    res.status(201).json(route);
});

// @desc    Update a transport route
// @route   PUT /transport/:id
// @access  Private (Admin)
const updateRoute = asyncHandler(async (req, res) => {
    const route = await TransportRoute.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!route) {
        res.status(404);
        throw new Error('Transport route not found');
    }
    res.json(route);
});

// @desc    Delete a transport route
// @route   DELETE /transport/:id
// @access  Private (Admin)
const deleteRoute = asyncHandler(async (req, res) => {
    const route = await TransportRoute.findById(req.params.id);
    if (route) {
        await route.deleteOne();
        res.json({ success: true, message: 'Transport route removed' });
    } else {
        res.status(404);
        throw new Error('Transport route not found');
    }
});

module.exports = {
    getRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
};