const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');
const { parsePagination } = require('../utils/pagination');

function slimLog(log) {
    const doc = { ...log };
    if (doc.actionType === 'POS_BILL' && doc.metadata) {
        const { items, subtotal, ...restMeta } = doc.metadata;
        doc.metadata = restMeta;
    }
    return doc;
}

router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.ownerId.toString();
        const filter = { user: userId };
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 30, maxLimit: 100 });

        if (req.query.worker && req.query.worker !== 'All') {
            filter.performedBy = req.query.worker;
        }

        const [logs, total, salesAgg, workers] = await Promise.all([
            ActivityLog.find(filter)
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments(filter),
            ActivityLog.aggregate([
                { $match: { user: userId, actionType: 'POS_BILL' } },
                { $group: { _id: null, totalSales: { $sum: { $ifNull: ['$metadata.finalTotal', 0] } } } },
            ]),
            ActivityLog.distinct('performedBy', { user: userId }),
        ]);

        res.json({
            items: logs.map(slimLog),
            total,
            page,
            limit,
            hasMore: skip + logs.length < total,
            totalSales: salesAgg[0]?.totalSales || 0,
            workers: workers.filter(Boolean),
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        if (req.user.role === 'worker') {
            return res.status(403).json({ message: 'Workers are not authorized to delete logs.' });
        }
        const log = await ActivityLog.findById(req.params.id);
        if (!log || log.user !== req.user.ownerId.toString()) {
            return res.status(401).json({ message: 'Not authorized or log not found' });
        }
        
        if (log.actionType === 'POS_BILL' && log.metadata && log.metadata.billId) {
            const Bill = require('../models/Bill');
            await Bill.findByIdAndDelete(log.metadata.billId);
        }

        await ActivityLog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Log deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete activity log' });
    }
});

module.exports = router;
