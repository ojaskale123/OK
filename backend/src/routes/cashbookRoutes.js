const express = require('express');
const router = express.Router();
const CashbookPerson = require('../models/CashbookPerson');
const CashbookTransaction = require('../models/CashbookTransaction');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

let masterPersons = [];
let masterTxns = [];

// Get all persons (Sidebar of Chat cashbook)
router.get('/persons', protect, async (req, res) => {
    if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') return res.json(masterPersons);
    const plan = req.user.subscription?.plan;
    if(plan === 'Shopkeeper' || plan === 'None') {
        return res.status(403).json({ message: "Cashbook requires Wholesale or Retail Pro plan." });
    }
    const persons = await CashbookPerson.find({ user: req.user.ownerId });
    res.json(persons);
});

router.post('/persons', protect, async (req, res) => {
    if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
        const person = { _id: Date.now().toString(), user: 'master-admin-id', name: req.body.name, contact: req.body.contact, netBalance: 0 };
        masterPersons.push(person);
        global.masterLogs = global.masterLogs || [];
        global.masterLogs.push({ _id: Date.now().toString(), date: new Date().toISOString(), user: 'master-admin-id', actionType: 'CASHBOOK_PERSON_ADD', description: `Added Person to Cashbook: ${req.body.name}`, metadata: { personId: person._id, name: req.body.name } });
        return res.status(201).json(person);
    }

    const person = await CashbookPerson.create({
        user: req.user.ownerId,
        name: req.body.name,
        contact: req.body.contact,
        netBalance: 0
    });
    
    await ActivityLog.create({
        user: req.user.ownerId.toString(), actionType: 'CASHBOOK_PERSON_ADD', description: `Added Person to Cashbook: ${req.body.name}`,
        metadata: { personId: person._id, name: req.body.name }
    });

    res.status(201).json(person);
});

// Get transactions for a specific person
router.get('/transactions/:personId', protect, async (req, res) => {
    if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
         return res.json(masterTxns.filter(t => t.person === req.params.personId));
    }
    const tx = await CashbookTransaction.find({ user: req.user.ownerId, person: req.params.personId }).sort({ date: 1 });
    res.json(tx);
});

// Add a transaction
router.post('/transactions', protect, async (req, res) => {
    const { personId, amount, type, note } = req.body;
    
    if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
        const tx = { _id: Date.now().toString(), user: 'master-admin-id', person: personId, amount, type, note, date: new Date().toISOString() };
        masterTxns.push(tx);
        const pIndex = masterPersons.findIndex(p => p._id === personId);
        if (pIndex !== -1) {
            if(type === 'receive') masterPersons[pIndex].netBalance -= amount;
            else masterPersons[pIndex].netBalance += amount;
            global.masterLogs = global.masterLogs || [];
            global.masterLogs.push({ _id: Date.now().toString(), date: new Date().toISOString(), user: 'master-admin-id', actionType: 'CASHBOOK_TXN_ADD', description: `Cashbook ${type === 'receive' ? 'Received from' : 'Given to'} ${masterPersons[pIndex].name}: ₹${amount}`, metadata: { personId, transactionId: tx._id, amount, type, note }});
            return res.status(201).json({ transaction: tx, newBalance: masterPersons[pIndex].netBalance });
        }
        return res.status(404).json({ message: "Person not found" });
    }

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
        metadata: { personId, transactionId: tx._id, amount, type, note }
    });

    res.status(201).json({ transaction: tx, newBalance: person.netBalance });
});

module.exports = router;
