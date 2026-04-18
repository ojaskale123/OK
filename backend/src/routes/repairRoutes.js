const express = require('express');
const router = express.Router();
const RepairJob = require('../models/RepairJob');
const { protect } = require('../middleware/authMiddleware');

// Get repair jobs. If shopkeeper, show all their shop jobs. If worker, show assigned or all depending on rules. Let's make it show all jobs for their shopkeeper.
router.get('/', protect, async (req, res) => {
    try {
        let shopkeeperId = req.user._id;
        
        // If current user is a worker, their shopkeeper is their employerId
        if (req.user.role === 'worker') {
            shopkeeperId = req.user.employerId;
        }

        const jobs = await RepairJob.find({ shopkeeperId }).populate('workerId', 'name email').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching repairs' });
    }
});

// Create a new repair job (accessible by shopkeeper or worker)
router.post('/', protect, async (req, res) => {
    try {
        let shopkeeperId = req.user._id;
        if (req.user.role === 'worker') {
            shopkeeperId = req.user.employerId;
        } else {
            // Verify plan for shopkeeper
            // const plan = req.user.subscription?.plan;
            // if (plan !== 'Wholesale' && plan !== 'Retail Pro' && req.user._id !== 'master-admin-id') {
            //     return res.status(403).json({ message: 'Upgrade plan to manage device repairs' });
            // }
        }

        const { customerName, customerPhone, deviceModel, issue, workerId } = req.body;

        const jobData = {
            customerName,
            customerPhone,
            deviceModel,
            issue,
            shopkeeperId,
            status: workerId ? 'Assigned' : 'Collected'
        };
        if (workerId) {
            jobData.workerId = workerId;
        }

        const newJob = await RepairJob.create(jobData);

        res.status(201).json(newJob);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating repair job' });
    }
});

// Update status, costing, or reassign
router.put('/:id', protect, async (req, res) => {
    try {
        const { status, costing, workerId } = req.body;
        const job = await RepairJob.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        if (status) job.status = status;
        if (costing !== undefined) job.costing = costing;
        if (workerId) {
            job.workerId = workerId;
            if(job.status === 'Collected') job.status = 'Assigned';
        }

        await job.save();
        res.json(job);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating job' });
    }
});

module.exports = router;
