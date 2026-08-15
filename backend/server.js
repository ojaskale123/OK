const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Route for testing
app.get('/', (req, res) => {
    res.send('OK ERP Backend is running...');
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/okerp';
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
})
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

const attendanceRoutes = require('./src/routes/attendanceRoutes');
app.use('/api/attendance', attendanceRoutes);

const adminRoutes = require('./src/routes/adminRoutes');
const loginApprovalRoutes = require('./src/routes/loginApprovalRoutes');
app.use('/api/admin', adminRoutes);
app.use('/api/login-approval', loginApprovalRoutes);

const gstRoutes = require('./src/routes/gstRoutes');
app.use('/api/gst', gstRoutes);

app.post('/api/upload-image', async (req, res) => {
    try {
        const { base64, fileName } = req.body;
        if (!base64) {
            return res.status(400).json({ message: 'Missing image data' });
        }

        const { uploadBase64ToDrive } = require('./src/utils/googleDrive');
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            return res.status(500).json({ message: 'Google Drive folder ID is not configured' });
        }

        const imageUrl = await uploadBase64ToDrive(base64, folderId, fileName || `job-sheet-${Date.now()}.png`);
        res.json({ imageUrl });
    } catch (error) {
        console.error('Image upload failed:', error);
        res.status(500).json({ message: error.message || 'Image upload failed' });
    }
});

// Automated Database Backup and Manual Backup Endpoint
const { backupDatabaseToDrive } = require('./src/utils/backupDatabase');

app.get('/api/backup', async (req, res) => {
    try {
        // Note: backup triggered from server UI or cron. Ensure the owner plan allows backups.
        // This endpoint is currently public for the server; do not expose in production without auth.
        const fileId = await backupDatabaseToDrive();
        res.json({ message: 'Backup successful', fileId });
    } catch (error) {
        res.status(500).json({ message: 'Backup failed', error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    
    // Schedule automated backup every 12 hours (12 * 60 * 60 * 1000 milliseconds)
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    setInterval(async () => {
        try {
            console.log('Running scheduled automatic backup...');
            await backupDatabaseToDrive();
        } catch (error) {
            console.error('Scheduled backup failed:', error);
        }
    }, TWELVE_HOURS);
});
