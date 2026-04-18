const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Bill = require('../models/Bill');
const CashbookPerson = require('../models/CashbookPerson');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, async (req, res) => {
    try {
        const userId = req.user._id;

        // Note: The master-admin-id operates with mock memory arrays in testing,
        // so real aggregations in MongoDB may inherently return 0 for it unless seeded.
        // However, for typical users logging in, we pull directly from the DB.

        // 1. Calculate Today's Sales
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

        const todaysBills = await Bill.find({
            user: userId,
            date: { $gte: today, $lt: tomorrow }
        });
        
        const todaySales = todaysBills.reduce((acc, bill) => acc + (bill.finalTotal || 0), 0);

        // 2. Calculate Low Stock Items
        // Using Mongoose aggregation or simple array filter (filter is safer for small datasets initially)
        const allProducts = await Product.find({ user: userId });
        
        const lowStockItemsArray = allProducts.filter(p => p.stockQuantity <= (p.thresholdAlert || 5));
        const lowStockItemsCount = lowStockItemsArray.length;
        
        // Grab exactly 3 names to display in the UI as examples
        const criticalItems = lowStockItemsArray
            .slice(0, 3)
            .map(p => ({
                name: p.name,
                stock: p.stockQuantity
            }));

        // 3. Calculate Net Cashbook Letgers
        const cashbookPersons = await CashbookPerson.find({ user: userId });
        // 'netBalance' goes UP when we GIVE money (they owe us: Positive). 
        // It goes DOWN when they GIVE money (we owe them: Negative).
        // Total Owed To You = sum of all positive netBalances
        const netCashbook = cashbookPersons.reduce((acc, person) => acc + (person.netBalance || 0), 0);

        // Fetch top recent activity (recent pos bills)
        const recentBills = await Bill.find({ user: userId })
            .sort({ date: -1 })
            .limit(3);
            
        const recentActivity = recentBills.map(b => ({
            desc: `Sold to ${b.customerName}`,
            amount: b.finalTotal,
            date: b.date
        }));

        res.json({
            todaySales,
            lowStockItemsCount,
            criticalItems,
            netCashbook,
            recentActivity
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

module.exports = router;
