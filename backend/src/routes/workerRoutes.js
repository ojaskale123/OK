const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Get all workers for the logged-in shopkeeper
router.get('/', protect, async (req, res) => {
    try {
        // Find all users whose employerId matches the logged in user
        const workers = await User.find({ employerId: req.user._id, role: 'worker' }).select('-password');
        res.json(workers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching workers' });
    }
});

// Create a new worker
router.post('/', protect, async (req, res) => {
    try {
        // Enforce plan restrictions here if necessary, though good to do on frontend too
        // Check if the user is Wholesale or Retail Pro
        const plan = req.user.subscription?.plan;
        if (plan !== 'Wholesale' && plan !== 'Retail Pro' && req.user._id !== 'master-admin-id') {
            return res.status(403).json({ message: 'Upgrade plan to manage workers' });
        }

        const { name, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const worker = await User.create({
            name,
            email,
            password,
            role: 'worker',
            employerId: req.user._id
        });

        res.status(201).json({ message: 'Worker created successfully', worker: { _id: worker._id, name: worker.name, email: worker.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating worker' });
    }
});

module.exports = router;
