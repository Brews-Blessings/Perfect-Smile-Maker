
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    data: { status: 'ok' },
    message: 'PSM API running'
  })
);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/doctors', require('./routes/slots'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/appointments', require('./routes/appointments'));

// Serve Frontend Homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../../frontend')));

// API 404 Handler
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: 'Server error'
  });
});

module.exports = app;