const express = require('express');
const router = express.Router();
const RepairJob = require('../models/RepairJob');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');
const { parsePagination } = require('../utils/pagination');

function resolveShopkeeperId(user) {
    return user.role === 'worker' ? user.employerId : user._id;
}

router.get('/', protect, async (req, res) => {
    try {
        const shopkeeperId = resolveShopkeeperId(req.user);
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 200 });

        const filter = { shopkeeperId };
        const [jobs, total] = await Promise.all([
            RepairJob.find(filter)
                .populate('workerId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            RepairJob.countDocuments(filter),
        ]);

        res.json({ items: jobs, total, page, limit, hasMore: skip + jobs.length < total });
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
            // if (plan !== 'Wholesale' && plan !== 'Retail Pro' && req.user._id !== '000000000000000000000000' && req.user._id !== '111111111111111111111111') {
            //     return res.status(403).json({ message: 'Upgrade plan to manage device repairs' });
            // }
        }

        const { customerName, customerPhone, deviceModel, issue, itemNote, workerId } = req.body;

        const jobData = {
            customerName,
            customerPhone,
            deviceModel,
            issue,
            itemNote: itemNote || '',
            shopkeeperId,
            status: workerId ? 'Assigned' : 'Collected'
        };
        if (workerId) {
            jobData.workerId = workerId;
        }

        const newJob = await RepairJob.create(jobData);

        await ActivityLog.create({
            user: req.user.ownerId.toString(),
            actionType: 'REPAIR_JOB_ADD',
            description: `New Repair Job: ${newJob.deviceModel} for ${newJob.customerName}`,
            performedBy: req.user.name || 'Owner',
            performedById: req.user._id.toString(),
            metadata: {
                jobId: newJob._id,
                customerName: newJob.customerName,
                deviceModel: newJob.deviceModel,
                itemNote: newJob.itemNote || ''
            }
        });

        res.status(201).json(newJob);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating repair job' });
    }
});

// Update status, costing, or reassign
router.put('/:id', protect, async (req, res) => {
    try {
        const { status, costing, workerId, itemNote } = req.body;
        const job = await RepairJob.findById(req.params.id);

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        if (status) {
            const isCompletingNow = status === 'Completed' && job.status !== 'Completed';
            job.status = status;
            
            if (isCompletingNow) {
                await ActivityLog.create({
                    user: req.user.ownerId.toString(),
                    actionType: 'REPAIR_JOB_COMPLETE',
                    description: `Repair Job Completed for ${job.deviceModel}`,
                    performedBy: req.user.name || 'Owner',
                    performedById: req.user._id.toString(),
                    metadata: {
                        jobId: job._id,
                        customerName: job.customerName,
                        deviceModel: job.deviceModel,
                        itemNote: job.itemNote || '',
                        costing: job.costing || 0
                    }
                });
            }
        }
        if (costing !== undefined) job.costing = costing;
        if (itemNote !== undefined) job.itemNote = itemNote || '';
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

// Delete a repair job
router.delete('/:id', protect, async (req, res) => {
    try {
        const job = await RepairJob.findById(req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        
        let shopkeeperId = req.user._id;
        if (req.user.role === 'worker') {
            shopkeeperId = req.user.employerId;
        }

        if (job.shopkeeperId.toString() !== shopkeeperId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await RepairJob.findByIdAndDelete(req.params.id);
        res.json({ message: 'Repair job deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting job' });
    }
});

module.exports = router;
