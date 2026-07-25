const express = require('express');
const WorkerLoginRequest = require('../models/WorkerLoginRequest');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');
const { generateToken, authUserPayload, getWorkerSubscription, LOGIN_APPROVAL_WINDOW_MS } = require('../utils/authHelpers');

const router = express.Router();

function employerOnly(req, res) {
    if (req.user.role === 'worker') {
        res.status(403).json({ message: 'Only shop admin can manage login approvals.' });
        return false;
    }
    return true;
}

function ownerId(req) {
    return (req.user.ownerId || req.user._id).toString();
}

async function expireIfNeeded(request) {
    if (request.status === 'pending' && request.expiresAt < new Date()) {
        request.status = 'expired';
        await request.save();
    }
    if (request.status === 'approved' && request.approvedUntil && request.approvedUntil < new Date()) {
        request.status = 'expired';
        await request.save();
    }
    return request;
}

// Worker polls this after submitting login credentials
router.get('/status/:requestId', async (req, res) => {
    try {
        const request = await WorkerLoginRequest.findById(req.params.requestId);
        if (!request) return res.status(404).json({ message: 'Login request not found.' });

        await expireIfNeeded(request);

        if (request.status === 'expired') {
            return res.json({ status: 'expired', message: 'Login request expired. Please try again.' });
        }
        if (request.status === 'denied') {
            return res.json({ status: 'denied', message: 'Login denied by shop admin.' });
        }
        if (request.status === 'pending') {
            return res.json({
                status: 'pending',
                message: 'Waiting for shop admin approval…',
                workerName: request.workerName,
                expiresAt: request.expiresAt,
            });
        }

        if (request.status === 'approved') {
            if (!request.approvedUntil || request.approvedUntil < new Date()) {
                request.status = 'expired';
                await request.save();
                return res.json({ status: 'expired', message: 'Approval expired. Please log in again for admin permission.' });
            }

            const worker = await User.findById(request.workerId)
                .select('name email role subscription walletBalance shopName gstSettings employerId')
                .lean();
            if (!worker) return res.status(404).json({ message: 'Worker account not found.' });

            const subscription = await getWorkerSubscription(worker);
            return res.json({
                status: 'approved',
                ...authUserPayload(worker, subscription),
                token: generateToken(worker._id),
            });
        }

        res.json({ status: 'pending', message: 'Processing approval…' });
    } catch (e) {
        res.status(500).json({ message: 'Error checking login status' });
    }
});

// Shop admin — list pending worker login requests
router.get('/pending', protect, async (req, res) => {
    try {
        if (!employerOnly(req, res)) return;

        const requests = await WorkerLoginRequest.find({
            employerId: ownerId(req),
            status: 'pending',
            expiresAt: { $gt: new Date() },
        })
            .sort({ requestedAt: -1 })
            .lean();

        res.json(requests);
    } catch (e) {
        res.status(500).json({ message: 'Error fetching pending logins' });
    }
});

router.post('/:id/approve', protect, async (req, res) => {
    try {
        if (!employerOnly(req, res)) return;

        const request = await WorkerLoginRequest.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: 'Request not found or already handled.' });
        }
        if (request.employerId.toString() !== ownerId(req)) {
            return res.status(403).json({ message: 'This worker does not belong to your shop.' });
        }

        await expireIfNeeded(request);
        if (request.status === 'expired') {
            return res.status(400).json({ message: 'Request expired. Worker must log in again.' });
        }

        const worker = await User.findById(request.workerId);
        if (!worker || worker.role !== 'worker') {
            return res.status(404).json({ message: 'Worker not found.' });
        }

        request.status = 'approved';
        request.approvedAt = new Date();
        request.approvedUntil = new Date(Date.now() + LOGIN_APPROVAL_WINDOW_MS);
        request.approvedBy = req.user._id;
        request.loginToken = generateToken(worker._id);
        await request.save();

        await ActivityLog.create({
            user: request.employerId.toString(),
            actionType: 'WORKER_LOGIN_APPROVED',
            description: `Login approved for ${request.workerName} (5 min access)`,
            performedBy: req.user.name || 'Shop Admin',
            performedById: req.user._id.toString(),
            metadata: { requestId: request._id, workerId: request.workerId, workerName: request.workerName },
        });

        res.json({
            message: `${request.workerName} can log in freely for the next 5 minutes.`,
            requestId: request._id,
            approvedUntil: request.approvedUntil,
        });
    } catch (e) {
        res.status(500).json({ message: 'Error approving login' });
    }
});

router.post('/:id/deny', protect, async (req, res) => {
    try {
        if (!employerOnly(req, res)) return;

        const request = await WorkerLoginRequest.findById(req.params.id);
        if (!request || request.status !== 'pending') {
            return res.status(404).json({ message: 'Request not found or already handled.' });
        }
        if (request.employerId.toString() !== ownerId(req)) {
            return res.status(403).json({ message: 'This worker does not belong to your shop.' });
        }

        request.status = 'denied';
        await request.save();

        await ActivityLog.create({
            user: request.employerId.toString(),
            actionType: 'WORKER_LOGIN_DENIED',
            description: `Login denied for ${request.workerName}`,
            performedBy: req.user.name || 'Shop Admin',
            performedById: req.user._id.toString(),
            metadata: { requestId: request._id, workerId: request.workerId, workerName: request.workerName },
        });

        res.json({ message: `Login denied for ${request.workerName}.` });
    } catch (e) {
        res.status(500).json({ message: 'Error denying login' });
    }
});

module.exports = router;
