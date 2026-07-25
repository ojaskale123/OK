const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Bill = require('../models/Bill');
const CashbookPerson = require('../models/CashbookPerson');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, async (req, res) => {
    try {
        const userId = req.user.ownerId;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const User = require('../models/User');

        const [
            salesAgg,
            lowStockAgg,
            netCashbookAgg,
            recentBills,
            owner,
            workers,
        ] = await Promise.all([
            Bill.aggregate([
                { $match: { user: userId, date: { $gte: today, $lt: tomorrow } } },
                { $group: { _id: null, todaySales: { $sum: '$finalTotal' } } },
            ]),
            Product.aggregate([
                { $match: { user: userId } },
                {
                    $addFields: {
                        threshold: { $ifNull: ['$thresholdAlert', 5] },
                    },
                },
                {
                    $facet: {
                        count: [
                            { $match: { $expr: { $lte: ['$stockQuantity', '$threshold'] } } },
                            { $count: 'n' },
                        ],
                        samples: [
                            { $match: { $expr: { $lte: ['$stockQuantity', '$threshold'] } } },
                            { $sort: { stockQuantity: 1 } },
                            { $limit: 3 },
                            { $project: { name: 1, stock: '$stockQuantity', _id: 0 } },
                        ],
                    },
                },
            ]),
            CashbookPerson.aggregate([
                { $match: { user: userId } },
                { $group: { _id: null, netCashbook: { $sum: '$netBalance' } } },
            ]),
            Bill.find({ user: userId })
                .sort({ date: -1 })
                .limit(3)
                .select('customerName finalTotal date')
                .lean(),
            User.findById(userId).select('shopLocation').lean(),
            User.find({ employerId: userId, role: 'worker' }).select('name email lastKnownLocation').lean(),
        ]);

        const todaySales = salesAgg[0]?.todaySales || 0;
        const lowStockFacet = lowStockAgg[0] || { count: [], samples: [] };
        const lowStockItemsCount = lowStockFacet.count[0]?.n || 0;
        const criticalItems = lowStockFacet.samples || [];
        const netCashbook = netCashbookAgg[0]?.netCashbook || 0;

        const recentActivity = recentBills.map((b) => ({
            desc: `Sold to ${b.customerName}`,
            amount: b.finalTotal,
            date: b.date,
        }));

        res.json({
            todaySales,
            lowStockItemsCount,
            criticalItems,
            netCashbook,
            recentActivity,
            workers,
            shopLocation: owner?.shopLocation || null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
