const express = require('express');
const cors = require('cors');
const path = require('path');
const moduleRoutes = require('./routes/moduleRoute');
const lessonRoutes = require('./routes/lessonRoute');
const questionRoutes = require('./routes/questionRoute');
const questionOptionRoutes = require('./routes/questionOptionRoute');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (req, res) => {
  res.send('Backend running');
});

app.use('/api/admin/modules', moduleRoutes);
app.use('/api/admin', lessonRoutes);
app.use('/api/admin', questionRoutes);
app.use('/api/admin', questionOptionRoutes);

module.exports = app;
