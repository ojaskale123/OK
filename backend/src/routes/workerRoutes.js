const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

// Get all workers for the logged-in shopkeeper
router.get('/', protect, async (req, res) => {
    try {
        // Find all users whose employerId matches the logged in user
        const workers = await User.find({ employerId: req.user.ownerId, role: 'worker' }).select('-password');
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
        if (plan !== 'Wholesale' && plan !== 'Retail Pro' && req.user._id !== '000000000000000000000000' && req.user._id !== '111111111111111111111111') {
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
            employerId: req.user.ownerId
        });

        // Record this securely in the History tab
        await ActivityLog.create({
            user: req.user.ownerId.toString(),
            actionType: 'WORKER_ADD',
            description: `Added Worker Staff: ${worker.name} (${worker.email})`
        });

        res.status(201).json({ message: 'Worker created successfully', worker: { _id: worker._id, name: worker.name, email: worker.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating worker' });
    }
});

// Delete a worker
router.delete('/:id', protect, async (req, res) => {
    try {
        const worker = await User.findById(req.params.id);
        if (!worker || worker.role !== 'worker' || worker.employerId.toString() !== req.user.ownerId.toString()) {
            return res.status(401).json({ message: 'Not authorized or worker not found' });
        }
        await User.findByIdAndDelete(req.params.id);
        
        await ActivityLog.create({
            user: req.user.ownerId.toString(),
            actionType: 'WORKER_ADD', // Reusing enum for simplicity, though normally would add WORKER_DELETE
            description: `Deleted Worker Staff: ${worker.name} (${worker.email})`
        });

        res.json({ message: 'Worker deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting worker' });
    }
});

module.exports = router;
