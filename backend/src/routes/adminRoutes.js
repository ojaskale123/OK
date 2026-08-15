const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const WorkerLoginRequest = require('../models/WorkerLoginRequest');
const { protect } = require('../middleware/authMiddleware');

const MASTER_EMAIL = 'ojask68@gmail.com';
const MASTER_ID = '000000000000000000000000';

const ensureMaster = (req, res, next) => {
    const isMaster = req.user?._id === MASTER_ID || req.user?.email === MASTER_EMAIL;
    const isAdmin = req.user?.role === 'admin';
    if (isMaster && isAdmin) {
        return next();
    }
    return res.status(403).json({ message: 'Access denied: master admin only.' });
};

router.use(protect, ensureMaster);

router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
        res.json(users);
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

router.post('/users', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim(),
            role: 'user',
            subscription: { plan: 'Shopkeeper', isActive: false }
        });

        const safeUser = user.toObject();
        delete safeUser.password;
        res.status(201).json(safeUser);
    } catch (error) {
        console.error('Admin create user error:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

router.post('/workers', async (req, res) => {
    try {
        const { name, email, password, employerId } = req.body;
        if (!name || !email || !password || !employerId) {
            return res.status(400).json({ message: 'Name, email, password, and employer are required.' });
        }

        const employer = await User.findById(employerId);
        if (!employer) {
            return res.status(404).json({ message: 'Employer not found.' });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists.' });
        }

        const worker = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim(),
            role: 'worker',
            employerId: employer._id,
            subscription: { plan: 'Shopkeeper', isActive: true }
        });

        const safeWorker = worker.toObject();
        delete safeWorker.password;
        res.status(201).json(safeWorker);
    } catch (error) {
        console.error('Admin create worker error:', error);
        res.status(500).json({ message: 'Failed to create worker' });
    }
});

router.put('/users/:id/block', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.email === MASTER_EMAIL) {
            return res.status(403).json({ message: 'Cannot block the master admin account.' });
        }

        user.isBlocked = !user.isBlocked;
        user.blockedAt = user.isBlocked ? new Date() : undefined;
        await user.save();

        res.json({
            userId: user._id,
            isBlocked: user.isBlocked,
            blockedAt: user.blockedAt,
        });
    } catch (error) {
        console.error('Admin block/unblock user error:', error);
        res.status(500).json({ message: 'Failed to update user block status' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const [userCount, workerCount, adminCount, pendingRequests, recentLogs] = await Promise.all([
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'worker' }),
            User.countDocuments({ role: 'admin' }),
            WorkerLoginRequest.countDocuments({ status: 'pending', expiresAt: { $gt: new Date() } }),
            ActivityLog.find({}).sort({ createdAt: -1 }).limit(6).lean(),
        ]);

        res.json({
            userCount,
            workerCount,
            adminCount,
            pendingRequests,
            recentLogs,
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Failed to load admin statistics' });
    }
});

module.exports = router;
