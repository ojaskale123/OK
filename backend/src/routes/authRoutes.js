const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const mongoose = require('mongoose');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const Bill = require('../models/Bill');
const CashbookPerson = require('../models/CashbookPerson');
const CashbookTransaction = require('../models/CashbookTransaction');
const RepairJob = require('../models/RepairJob');

// Factory reset endpoint has been removed for security to prevent data loss.

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // UNIVERSAL MASTER BYPASS
        const isMaster1 = email?.trim() === 'ojask68@gmail.com' && password?.trim() === 'Ookale@123';
        const isMaster2 = email?.trim() === 'frndztelecomm61@gmail.com' && password?.trim() === 'Frndz12345';
        if (isMaster1 || isMaster2) {
            const masterId = isMaster1 ? 'master-admin-id' : 'master-admin-id-2';
            return res.json({
                _id: masterId,
                name: isMaster1 ? 'Ojas' : 'Frndz Telecom',
                email: isMaster1 ? 'ojask68@gmail.com' : 'frndztelecomm61@gmail.com',
                role: 'admin',
                token: generateToken(masterId),
                subscription: { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true },
                walletBalance: 0
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        // Generate a unique referral code to bypass any accidental MongoDB unique null index collisions
        const referralCode = `OK-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

        const user = await User.create({ name, email, password, referralCode });
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            subscription: user.subscription
        });
    } catch (error) {
        console.error("Register Error Details:", error);
        res.status(500).json({ message: error.message || 'Server error', details: error.toString() });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // UNIVERSAL MASTER LOGIN (Works even without DB)
        const isMaster1 = email?.trim() === 'ojask68@gmail.com' && password?.trim() === 'Ookale@123';
        const isMaster2 = email?.trim() === 'frndztelecomm61@gmail.com' && password?.trim() === 'Frndz12345';
        if (isMaster1 || isMaster2) {
            const masterId = isMaster1 ? 'master-admin-id' : 'master-admin-id-2';
            return res.json({
                _id: masterId,
                name: isMaster1 ? 'Ojas' : 'Frndz Telecom',
                email: isMaster1 ? 'ojask68@gmail.com' : 'frndztelecomm61@gmail.com',
                role: 'admin',
                token: generateToken(masterId),
                subscription: { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true },
                walletBalance: 0
            });
        }

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            let subscription = user.subscription;
            if (user.role === 'worker' && user.employerId) {
                if (user.employerId.toString() === '000000000000000000000000') {
                    subscription = { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true };
                } else {
                    const employer = await User.findById(user.employerId).select('subscription');
                    if (employer) subscription = employer.subscription;
                }
            }
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
                subscription: subscription,
                walletBalance: user.walletBalance
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
