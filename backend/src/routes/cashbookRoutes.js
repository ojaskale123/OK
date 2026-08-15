const express = require('express');
const router = express.Router();
const CashbookPerson = require('../models/CashbookPerson');
const CashbookTransaction = require('../models/CashbookTransaction');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

// Get all persons (Sidebar of Chat cashbook)
router.get('/persons', protect, async (req, res) => {
    const { canAccessFeature } = require('../utils/planUtils');
    const plan = req.user.subscription?.plan || 'basic';
    if (!canAccessFeature(plan, 'cashbook')) {
        return res.status(403).json({ message: 'Your plan does not include Cashbook. Please upgrade.' });
    }
    const persons = await CashbookPerson.find({ user: req.user.ownerId });
    res.json(persons);
});

router.post('/persons', protect, async (req, res) => {
    const { canAccessFeature } = require('../utils/planUtils');
    const plan = req.user.subscription?.plan || 'basic';
    if (!canAccessFeature(plan, 'cashbook')) return res.status(403).json({ message: 'Your plan does not include Cashbook. Please upgrade.' });

    const person = await CashbookPerson.create({
        user: req.user.ownerId,
        name: req.body.name,
        contact: req.body.contact,
        netBalance: 0
    });
    
    await ActivityLog.create({
        user: req.user.ownerId.toString(), actionType: 'CASHBOOK_PERSON_ADD', description: `Added Person to Cashbook: ${req.body.name}`,
        performedBy: req.user.name || 'Owner',
        performedById: req.user._id.toString(),
        metadata: { personId: person._id, name: req.body.name }
    });

    res.status(201).json(person);
});

// Get transactions for a specific person
router.get('/transactions/:personId', protect, async (req, res) => {
    const tx = await CashbookTransaction.find({ user: req.user.ownerId, person: req.params.personId }).sort({ date: 1 });
    res.json(tx);
});

// Add a transaction
router.post('/transactions', protect, async (req, res) => {
    const { canAccessFeature } = require('../utils/planUtils');
    const plan = req.user.subscription?.plan || 'basic';
    if (!canAccessFeature(plan, 'cashbook')) return res.status(403).json({ message: 'Your plan does not include Cashbook. Please upgrade.' });

    const { personId, amount, type, note } = req.body;
    const tx = await CashbookTransaction.create({
        user: req.user.ownerId,
        person: personId,
        amount, type, note
    });

    const person = await CashbookPerson.findById(personId);
    if(type === 'receive') {
        // They gave us money, so the amount they owe goes DOWN
        person.netBalance -= amount;
    } else {
        // We gave them money, so the amount they owe goes UP
        person.netBalance += amount;
    }
    await person.save();

    await ActivityLog.create({
        user: req.user.ownerId.toString(), actionType: 'CASHBOOK_TXN_ADD', description: `Cashbook ${type === 'receive' ? 'Received from' : 'Given to'} ${person.name}: ₹${amount}`,
        performedBy: req.user.name || 'Owner',
        performedById: req.user._id.toString(),
        metadata: { personId, transactionId: tx._id, amount, type, note }
    });

    res.status(201).json({ transaction: tx, newBalance: person.netBalance });
});

module.exports = router;
