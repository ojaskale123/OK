const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

let masterBills = [];

router.post('/', protect, async (req, res) => {
    try {
        const { customerName, customerPhone, items, subtotal, discountApplied, finalTotal, paymentMode } = req.body;
        
        if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
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
    if (req.user._id === 'master-admin-id' || req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') return res.json([...masterBills].reverse());
    const bills = await Bill.find({ user: req.user.ownerId }).sort({ date: -1 }).lean();
    res.json(bills);
});

// Delete a POS Bill
router.delete('/:id', protect, async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill || bill.user.toString() !== req.user.ownerId.toString()) {
            return res.status(401).json({ message: 'Not authorized or bill not found' });
        }
        await Bill.findByIdAndDelete(req.params.id);
        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting bill' });
    }
});

module.exports = router;
