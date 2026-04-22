const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Basic Route for testing
app.get('/', (req, res) => {
    res.send('OK ERP Backend is running...');
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected successfully.'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const posRoutes = require('./src/routes/posRoutes');
const cashbookRoutes = require('./src/routes/cashbookRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const historyRoutes = require('./src/routes/historyRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/cashbook', cashbookRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/history', historyRoutes);

const workerRoutes = require('./src/routes/workerRoutes');
const repairRoutes = require('./src/routes/repairRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

app.use('/api/workers', workerRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/dashboard', dashboardRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
