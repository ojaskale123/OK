const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to authenticate
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

router.use(authMiddleware);

// Haversine formula to calculate distance in meters
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; 
  return d * 1000; // Distance in meters
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Set Shop Location (Admin only)
router.post('/shop-location', async (req, res) => {
    try {
        const { lat, lng, address } = req.body;
        const user = await User.findById(req.user.id);
        
        if (user.role !== 'admin' && user.role !== 'user') {
            return res.status(403).json({ message: 'Only employers can set shop location' });
        }

        user.shopLocation = { lat, lng, address };
        await user.save();
        res.json({ message: 'Shop location updated successfully', shopLocation: user.shopLocation });
    } catch (e) {
        res.status(500).json({ message: 'Error setting location' });
    }
});

// Check-in (Worker only)
router.post('/check-in', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const worker = await User.findById(req.user.id);
        
        if (worker.role !== 'worker') {
            return res.status(403).json({ message: 'Only workers can clock in' });
        }

        const employer = await User.findById(worker.employerId);
        if (!employer.shopLocation || !employer.shopLocation.lat) {
            return res.status(400).json({ message: 'Employer has not set the shop location yet.' });
        }

        // Calculate distance
        const distance = getDistanceFromLatLonInM(lat, lng, employer.shopLocation.lat, employer.shopLocation.lng);
        
        if (distance > 100) { // 100 meters radius
            return res.status(403).json({ message: `You are too far from the shop (${Math.round(distance)}m away). You must be within 100m to clock in.` });
        }

        const today = new Date().toISOString().split('T')[0];
        
        // Check if already checked in today
        let attendance = await Attendance.findOne({ workerId: worker._id, date: today });
        if (attendance) {
            return res.status(400).json({ message: 'You have already clocked in today.' });
        }

        attendance = new Attendance({
            workerId: worker._id,
            employerId: employer._id,
            date: today,
            checkInTime: new Date(),
            checkInLocation: { lat, lng, distanceFromShop: distance }
        });

        await attendance.save();
        res.json({ message: 'Checked in successfully!', attendance });

    } catch (e) {
        res.status(500).json({ message: 'Error checking in', error: e.message });
    }
});

// Check-out (Worker only)
router.post('/check-out', async (req, res) => {
    try {
        const worker = await User.findById(req.user.id);
        const today = new Date().toISOString().split('T')[0];
        
        let attendance = await Attendance.findOne({ workerId: worker._id, date: today });
        if (!attendance) {
            return res.status(400).json({ message: 'No check-in record found for today.' });
        }
        
        if (attendance.checkOutTime) {
            return res.status(400).json({ message: 'You have already clocked out today.' });
        }

        attendance.checkOutTime = new Date();
        await attendance.save();
        
        res.json({ message: 'Checked out successfully!', attendance });
    } catch (e) {
        res.status(500).json({ message: 'Error checking out' });
    }
});

// Get Attendance Records (Employer gets all, Worker gets own)
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        let records;
        
        if (user.role === 'worker') {
            records = await Attendance.find({ workerId: user._id }).sort({ date: -1 }).populate('workerId', 'name email');
        } else {
            // Admin/Employer
            records = await Attendance.find({ employerId: user._id }).sort({ date: -1 }).populate('workerId', 'name email');
        }
        
        res.json(records);
    } catch (e) {
        res.status(500).json({ message: 'Error fetching attendance records' });
    }
});

module.exports = router;
