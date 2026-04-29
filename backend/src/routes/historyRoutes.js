const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

global.masterLogs = global.masterLogs || [];

// Get all activity logs for the user
router.get('/', protect, async (req, res) => {
    try {
        const logs = await ActivityLog.find({ user: req.user.ownerId.toString() }).sort({ date: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

// Delete an activity log
router.delete('/:id', protect, async (req, res) => {
    try {
        const log = await ActivityLog.findById(req.params.id);
        if (!log || log.user !== req.user.ownerId.toString()) {
            return res.status(401).json({ message: 'Not authorized or log not found' });
        }
        
        // If this is a POS_BILL, also delete the actual Bill document to fix revenue metrics
        if (log.actionType === 'POS_BILL' && log.metadata && log.metadata.billId) {
            const Bill = require('../models/Bill'); // Local require to avoid circular dependency issues if any
            await Bill.findByIdAndDelete(log.metadata.billId);
        }

        await ActivityLog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Log deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete activity log' });
    }
});

module.exports = router;
