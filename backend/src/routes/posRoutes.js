const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

let masterBills = [];

router.post('/', protect, async (req, res) => {
    try {
        const { customerName, customerPhone, items, subtotal, discountApplied, finalTotal, paymentMode } = req.body;
        
        if (req.user._id === 'master-admin-id') {
            const bill = { _id: Date.now().toString(), customerName, customerPhone, items, subtotal, discountApplied, finalTotal, paymentMode, date: new Date().toISOString() };
            masterBills.push(bill);
            global.masterLogs = global.masterLogs || [];
            global.masterLogs.push({
                _id: Date.now().toString(), date: new Date().toISOString(),
                user: req.user._id, actionType: 'POS_BILL', description: `Created Bill for ${customerName}`,
                metadata: { billId: bill._id, finalTotal: bill.finalTotal, customerName, customerPhone, items, subtotal, discountApplied }
            });
            return res.status(201).json(bill);
        }

        const bill = await Bill.create({
            user: req.user.ownerId,
            customerName, customerPhone, items, subtotal, discountApplied, finalTotal, paymentMode
        });
        
        await ActivityLog.create({
            user: req.user.ownerId.toString(), actionType: 'POS_BILL', description: `Created Bill for ${customerName}`,
            metadata: { billId: bill._id, finalTotal: bill.finalTotal, customerName, customerPhone, items, subtotal, discountApplied }
        });

        if (typeof req.user.save === 'function') {
            req.user.walletBalance = (req.user.walletBalance || 0) + 5;
            await req.user.save();
        }
        
        res.status(201).json(bill);
    } catch(err) {
        res.status(500).json({ error: 'Failed to create POS Bill' });
    }
});

router.get('/', protect, async (req, res) => {
    if (req.user._id === 'master-admin-id') return res.json([...masterBills].reverse());
    const bills = await Bill.find({ user: req.user.ownerId }).sort({ date: -1 });
    res.json(bills);
});

module.exports = router;
