const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const ActivityLog = require('../models/ActivityLog');

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in m
  return d;
}

const router = express.Router();

router.use(protect);

// Get Shop Location (Worker only)
router.get('/shop-location', async (req, res) => {
    try {
        const worker = await User.findById(req.user._id);
        if (!worker) return res.status(404).json({ message: 'Worker not found.' });
        
        if (worker.role !== 'worker') {
            return res.status(403).json({ message: 'Only workers can retrieve shop location' });
        }

        if (!worker.employerId) {
            return res.status(404).json({ message: 'No employer assigned to worker.' });
        }
        const employer = await User.findById(worker.employerId);
        if (!employer) return res.status(404).json({ message: 'Employer not found.' });

        if (!employer.shopLocation || !employer.shopLocation.lat || !employer.shopLocation.lng) {
            return res.status(404).json({ message: 'Shop location not set by employer.' });
        }

        res.json(employer.shopLocation);
    } catch (e) {
        res.status(500).json({ message: 'Error retrieving shop location', error: e.message });
    }
});

// Check-in (Worker only)
router.post('/check-in', async (req, res) => {
    try {
        let { location, checkInSelfie } = req.body;
        
        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({ message: 'Location data is required to clock in.' });
        }

        if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
            return res.status(400).json({ message: 'Virtual Master Accounts cannot clock in.' });
        }

        const worker = await User.findById(req.user._id);
        if (!worker) return res.status(404).json({ message: 'Worker not found.' });
        
        if (worker.role !== 'worker') {
            return res.status(403).json({ message: 'Only workers can clock in' });
        }

        const employer = await User.findById(worker.employerId);
        if (!employer) return res.status(404).json({ message: 'Employer not found.' });

        // Skip location check for Virtual Master Accounts' workers for testing ease if needed,
        // but normally we enforce the shopLocation check:
        if (!employer.shopLocation || !employer.shopLocation.lat || !employer.shopLocation.lng) {
             return res.status(400).json({ message: 'Your employer has not set the shop location yet. Please ask them to set it in their profile.' });
        }

        const distance = getDistanceFromLatLonInMeters(
             location.lat, location.lng, 
             employer.shopLocation.lat, employer.shopLocation.lng
        );

        if (distance > 100) {
             return res.status(400).json({ message: `You are too far from the shop (${Math.round(distance)}m). You must be within 100m to clock in.` });
        }

        const today = new Date().toISOString().split('T')[0];
        
        let attendance = await Attendance.findOne({ workerId: worker._id, date: today });
        if (attendance) {
            return res.status(400).json({ message: 'You have already clocked in today.' });
        }

        attendance = new Attendance({
            workerId: worker._id,
            employerId: worker.employerId,
            date: today,
            checkInTime: new Date(),
            checkInLocation: location
        });

        await attendance.save();

        await ActivityLog.create({
            user: worker.employerId.toString(),
            actionType: 'ATTENDANCE_CHECK_IN',
            description: `${worker.name} checked in (Staff Attendance)`,
            performedBy: worker.name,
            performedById: worker._id.toString(),
            metadata: {
                workerId: worker._id,
                workerName: worker.name,
                checkInTime: attendance.checkInTime,
                location: location
            }
        });

        res.json({ message: 'Checked in successfully!', attendance });

    } catch (e) {
        res.status(500).json({ message: 'Error checking in', error: e.message });
    }
});

const BREAK_DURATION_MS = 90 * 60 * 1000;

function performCheckout(attendance, worker, reason = 'manual') {
    attendance.checkOutTime = new Date();
    attendance.checkOutReason = reason;
    return attendance.save().then(async (saved) => {
        const reasonText =
            reason === 'break_expired_outside'
                ? ' (auto: break ended, still outside shop)'
                : reason === 'geofence'
                  ? ' (auto: left shop area)'
                  : '';
        await ActivityLog.create({
            user: worker.employerId.toString(),
            actionType: 'ATTENDANCE_CHECK_OUT',
            description: `${worker.name} checked out${reasonText}`,
            performedBy: worker.name,
            performedById: worker._id.toString(),
            metadata: {
                workerId: worker._id,
                workerName: worker.name,
                checkOutTime: saved.checkOutTime,
                checkOutReason: reason,
                breakStartTime: saved.breakStartTime,
                breakEndTime: saved.breakEndTime,
            },
        });
        return saved;
    });
}

// Check-out (Worker only)
router.post('/check-out', async (req, res) => {
    try {
        if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
            return res.status(400).json({ message: 'Virtual Master Accounts cannot clock out.' });
        }

        const worker = await User.findById(req.user._id);
        if (!worker) return res.status(404).json({ message: 'Worker not found.' });
        const today = new Date().toISOString().split('T')[0];

        let attendance = await Attendance.findOne({ workerId: worker._id, date: today });
        if (!attendance) {
            return res.status(400).json({ message: 'No check-in record found for today.' });
        }

        if (attendance.checkOutTime) {
            return res.status(400).json({ message: 'You have already clocked out today.' });
        }

        const reason = ['manual', 'geofence', 'break_expired_outside'].includes(req.body?.reason)
            ? req.body.reason
            : 'manual';

        const saved = await performCheckout(attendance, worker, reason);
        res.json({ message: 'Checked out successfully!', attendance: saved });
    } catch (e) {
        res.status(500).json({ message: 'Error checking out' });
    }
});

// Start 90-minute break (Worker only — geofence paused until break ends)
router.post('/break/start', async (req, res) => {
    try {
        const worker = await User.findById(req.user._id);
        if (!worker || worker.role !== 'worker') {
            return res.status(403).json({ message: 'Only workers can start a break.' });
        }

        const today = new Date().toISOString().split('T')[0];
        const attendance = await Attendance.findOne({ workerId: worker._id, date: today });

        if (!attendance || !attendance.checkInTime) {
            return res.status(400).json({ message: 'Clock in before starting a break.' });
        }
        if (attendance.checkOutTime) {
            return res.status(400).json({ message: 'Already clocked out for today.' });
        }
        if (attendance.breakStartTime) {
            return res.status(400).json({ message: 'You already used your break for today.' });
        }

        const now = new Date();
        attendance.breakStartTime = now;
        attendance.breakEndTime = new Date(now.getTime() + BREAK_DURATION_MS);
        await attendance.save();

        await ActivityLog.create({
            user: worker.employerId.toString(),
            actionType: 'ATTENDANCE_BREAK',
            description: `${worker.name} started a 90-minute break`,
            performedBy: worker.name,
            performedById: worker._id.toString(),
            metadata: {
                workerId: worker._id,
                breakStartTime: attendance.breakStartTime,
                breakEndTime: attendance.breakEndTime,
            },
        });

        res.json({
            message: 'Break started — you have 90 minutes. Shop radius tracking is paused.',
            attendance,
        });
    } catch (e) {
        res.status(500).json({ message: 'Error starting break', error: e.message });
    }
});

// Get today's attendance status (Worker)
router.get('/today', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const today = new Date().toISOString().split('T')[0];

        if (user.role === 'worker') {
            const record = await Attendance.findOne({ workerId: user._id, date: today }).lean();
            return res.json({ record: record || null });
        }

        res.status(403).json({ message: 'Workers only' });
    } catch (e) {
        res.status(500).json({ message: 'Error fetching today status' });
    }
});

// Get Attendance Records (Employer gets all, Worker gets own)
router.get('/', async (req, res) => {
    try {
        const { parsePagination } = require('../utils/pagination');
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 200 });

        if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
            const filter = { employerId: req.user._id };
            if (req.query.from && req.query.to) {
                filter.date = { $gte: req.query.from, $lte: req.query.to };
            }
            const [records, total] = await Promise.all([
                Attendance.find(filter)
                    .sort({ date: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('workerId', 'name email')
                    .select('-checkInSelfie')
                    .lean(),
                Attendance.countDocuments(filter),
            ]);
            return res.json({ items: records, total, page, limit, hasMore: skip + records.length < total });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found.' });
        
        const filter = user.role === 'worker'
            ? { workerId: user._id }
            : { employerId: user._id };

        if (req.query.from && req.query.to) {
            filter.date = { $gte: req.query.from, $lte: req.query.to };
        }

        const [records, total] = await Promise.all([
            Attendance.find(filter)
                .sort({ date: -1 })
                .skip(skip)
                .limit(limit)
                .populate('workerId', 'name email')
                .select('-checkInSelfie')
                .lean(),
            Attendance.countDocuments(filter),
        ]);

        res.json({ items: records, total, page, limit, hasMore: skip + records.length < total });
    } catch (e) {
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
});

// Update live location (Worker only)
router.put('/live-location', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({ message: 'Latitude and Longitude are required.' });
        }

        const worker = await User.findById(req.user._id);
        if (!worker) return res.status(404).json({ message: 'Worker not found.' });
        
        if (worker.role !== 'worker') {
            return res.status(403).json({ message: 'Only workers can report live location' });
        }

        const lastUpdate = worker.lastKnownLocation?.updatedAt;
        if (lastUpdate && Date.now() - new Date(lastUpdate).getTime() < 45000) {
            return res.json({ message: 'Location update throttled.' });
        }

        worker.lastKnownLocation = {
            lat,
            lng,
            updatedAt: new Date()
        };
        await worker.save();

        const employer = await User.findById(worker.employerId);
        if (employer && employer.shopLocation && employer.shopLocation.lat && employer.shopLocation.lng) {
            const distance = getDistanceFromLatLonInMeters(
                lat, lng,
                employer.shopLocation.lat, employer.shopLocation.lng
            );
            if (distance > 100) {
                const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
                const recentLog = await ActivityLog.findOne({
                    user: worker.employerId.toString(),
                    actionType: 'GEOFENCE_BREACH',
                    'metadata.workerId': worker._id,
                    date: { $gte: fifteenMinsAgo }
                });

                if (!recentLog) {
                    await ActivityLog.create({
                        user: worker.employerId.toString(),
                        actionType: 'GEOFENCE_BREACH',
                        description: `⚠️ Geofence Crossed: ${worker.name} is ${Math.round(distance)}m away from shop!`,
                        performedBy: worker.name,
                        performedById: worker._id.toString(),
                        metadata: {
                            workerId: worker._id,
                            workerName: worker.name,
                            distance: Math.round(distance),
                            location: { lat, lng }
                        }
                    });
                }
            }
        }

        res.json({ message: 'Live location updated successfully.' });
    } catch (e) {
        res.status(500).json({ message: 'Error updating live location', error: e.message });
    }
});

module.exports = router;
