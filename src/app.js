const express = require('express');
const cors = require('cors');
const path = require('path');
const courseRoutes = require('./routes/courseRoute');
const lessonRoutes = require('./routes/lessonRoute');
const questionRoutes = require('./routes/questionRoute');
const questionOptionRoutes = require('./routes/questionOptionRoute');
const { getCourseAppDetails, getCourseWeeksApp } = require('./controllers/courseController');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.send('Backend running - app-route-build');
});

app.get('/api/admin/courses/:courseId/app', getCourseAppDetails);
app.get('/api/admin/courses/:courseId/weeks/app', getCourseWeeksApp);
app.get('/api/admin/course-app/:courseId', getCourseAppDetails);
app.use('/api/admin/courses', courseRoutes);
app.use('/api/admin', lessonRoutes);
app.use('/api/admin', questionRoutes);
app.use('/api/admin', questionOptionRoutes);

module.exports = app;
