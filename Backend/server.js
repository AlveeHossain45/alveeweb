const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
// Load environment variables
dotenv.config();
// Connect to the database
connectDB();
const app = express();
// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '50mb' })); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // To parse URL-encoded bodies
app.get('/', (req, res) => {
    res.status(200).json({ message: 'EduSys Pro API is online and running.Thanks For visiting......' });
});
// In server.js, near the other app.use() calls
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- API ROUTES ---
app.use('/', require('./routes/auth.routes')); 
app.use('/users', require('./routes/user.routes'));
app.use('/students', require('./routes/student.routes'));
app.use('/teachers', require('./routes/teacher.routes'));
app.use('/staffs', require('./routes/staff.routes')); 
app.use('/subjects', require('./routes/subject.routes'));
app.use('/sections', require('./routes/section.routes')); 
app.use('/departments', require('./routes/department.routes'));
app.use('/timetable', require('./routes/timetable.routes'));
app.use('/notices', require('./routes/notice.routes'));
app.use('/financial', require('./routes/financial.routes'));
app.use('/exams', require('./routes/exam.routes'));
app.use('/results', require('./routes/result.routes'));
app.use('/attendance', require('./routes/attendance.routes'));
app.use('/library', require('./routes/library.routes'));
app.use('/transport', require('./routes/transport.routes'));

// --- Error Handling Middleware ---
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4051;

app.listen(PORT, () =>
  console.log(`Server is running successfully on http://localhost:${PORT}`)
);