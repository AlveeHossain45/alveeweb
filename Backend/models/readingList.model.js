// models/readingList.model.js
const mongoose = require('mongoose');

const readingListSchema = new mongoose.Schema({
    name: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    sectionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Section', 
        required: true 
    },
    bookIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
    }],
}, { timestamps: true });

readingListSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

module.exports = mongoose.model('ReadingList', readingListSchema);