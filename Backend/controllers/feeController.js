const asyncHandler = require('express-async-handler');
const Fee = require('../models/fee.model.js');
const Student = require('../models/student.model.js');

// @desc    Get all fee records
// @route   GET /financial/fees
// @access  Private
// In controllers/feeController.js

const getFees = asyncHandler(async (req, res) => {
    // This is much faster than .find().populate() for large datasets
    const fees = await Fee.aggregate([
        // Stage 1: Sort the fees first, which is often more efficient
        { $sort: { dueDate: -1 } },

        // Stage 2: "Join" with the 'students' collection
        {
            $lookup: {
                from: 'students', // The collection name to join with
                localField: 'studentId', // The field from the Fee model
                foreignField: '_id', // The field from the Student model
                as: 'studentDetails' // The name of the new array field to add
            }
        },

        // Stage 3: Deconstruct the 'studentDetails' array
        {
            $unwind: {
                path: '$studentDetails',
                preserveNullAndEmptyArrays: true // Keep fee records even if student was deleted
            }
        },

        // Stage 4: Reshape the output to match the frontend's expectation
        {
            $project: {
                _id: 1, // Keep the original _id
                feeType: 1,
                amount: 1,
                dueDate: 1,
                status: 1,
                paidDate: 1,
                // Create a studentId object that looks like what populate() would create
                studentId: {
                    _id: '$studentDetails._id',
                    name: '$studentDetails.name',
                    rollNo: '$studentDetails.rollNo'
                }
            }
        }
    ]);

    // The aggregation pipeline returns plain objects, so we manually add the 'id' field
    const transformedFees = fees.map(fee => ({ ...fee, id: fee._id.toString() }));

    res.json(transformedFees);
});
// @desc    Create a new fee record
// @route   POST /financial/fees
// @access  Private (Admin/Accountant)
const createFee = asyncHandler(async (req, res) => {
    const { studentId, feeType, amount, dueDate, status } = req.body;
    if (!studentId || !feeType || !amount || !dueDate) {
        res.status(400);
        throw new Error('Missing required fields for fee record');
    }
    const fee = await Fee.create({ studentId, feeType, amount, dueDate, status: status || 'Unpaid' });
    res.status(201).json(fee);
});

// @desc    Update a fee record (e.g., mark as paid)
// @route   PUT /financial/fees/:id
// @access  Private (Admin/Accountant)
const updateFee = asyncHandler(async (req, res) => {
    const fee = await Fee.findById(req.params.id);
    if (fee) {
        fee.status = req.body.status || fee.status;
        fee.paidDate = req.body.paidDate || fee.paidDate;
        if (req.body.status === 'Paid' && !req.body.paidDate) {
            fee.paidDate = new Date();
        }
        fee.feeType = req.body.feeType || fee.feeType;
        fee.amount = req.body.amount || fee.amount;
        fee.dueDate = req.body.dueDate || fee.dueDate;

        const updatedFee = await fee.save();
        res.json(updatedFee);
    } else {
        res.status(404);
        throw new Error('Fee record not found');
    }
});

// @desc    Delete a fee record
// @route   DELETE /financial/fees/:id
// @access  Private (Admin)
const deleteFee = asyncHandler(async (req, res) => {
    const fee = await Fee.findById(req.params.id);
    if (fee) {
        await fee.deleteOne();
        res.json({ message: 'Fee record removed' });
    } else {
        res.status(404);
        throw new Error('Fee record not found');
    }
});

// @desc    Generate monthly tuition fees for all students
// @route   POST /financial/fees/generate
// @access  Private (Admin/Accountant)
const generateMonthlyFees = asyncHandler(async (req, res) => {
    const { feeType, amount, dueDate } = req.body;
    const students = await Student.find({});
    
    let generatedCount = 0;
    const feePromises = [];

    for (const student of students) {
        const existingFee = await Fee.findOne({ studentId: student._id, feeType: feeType });
        if (!existingFee) {
            feePromises.push(Fee.create({
                studentId: student._id,
                feeType: feeType,
                amount: amount,
                dueDate: dueDate,
                status: 'Unpaid'
            }));
            generatedCount++;
        }
    }
    await Promise.all(feePromises);
    res.status(201).json({ message: `Successfully generated ${generatedCount} new monthly fee records.` });
});

// @desc    Delete multiple fee records at once
// @route   DELETE /financial/fees/bulk
// @access  Private (Admin)
const bulkDeleteFees = asyncHandler(async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400);
        throw new Error('An array of fee record IDs is required.');
    }

    const result = await Fee.deleteMany({ _id: { $in: ids } });

    if (result.deletedCount === 0) {
        res.status(404);
        throw new Error('No matching fee records found to delete.');
    }

    res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.deletedCount} fee records.`
    });
});

module.exports = {
    getFees,
    createFee,
    updateFee,
    deleteFee,
    generateMonthlyFees,
    bulkDeleteFees // <-- EXPORT THE NEW FUNCTION
};