const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

global.masterLogs = global.masterLogs || [];

// Get all activity logs for the user
router.get('/', protect, async (req, res) => {
    try {
        if (req.user._id === 'master-admin-id') return res.json([...global.masterLogs].reverse());
        const logs = await ActivityLog.find({ user: req.user._id.toString() }).sort({ date: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

module.exports = router;
