const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const mongoose = require('mongoose');
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const Bill = require('../models/Bill');
const CashbookPerson = require('../models/CashbookPerson');
const CashbookTransaction = require('../models/CashbookTransaction');
const RepairJob = require('../models/RepairJob');
const Attendance = require('../models/Attendance');
const WorkerLoginRequest = require('../models/WorkerLoginRequest');
const { generateToken, defaultGstSettings, authUserPayload, getWorkerSubscription } = require('../utils/authHelpers');

router.get('/migrate', async (req, res) => {
    try {
        const master1 = await User.findOne({ email: 'ojask68@gmail.com' });
        const master2 = await User.findOne({ email: 'frndztelecomm61@gmail.com' });

        const migrations = [
            { user: master1, virtualId: '000000000000000000000000' },
            { user: master2, virtualId: '111111111111111111111111' }
        ];

        let results = [];
        for (const m of migrations) {
            if (!m.user) continue;
            const realId = m.user._id;
            const vId = m.virtualId;

            await Product.updateMany({ user: vId }, { $set: { user: realId } });
            await Bill.updateMany({ user: vId }, { $set: { user: realId } });
            await CashbookPerson.updateMany({ user: vId }, { $set: { user: realId } });
            await CashbookTransaction.updateMany({ user: vId }, { $set: { user: realId } });
            await RepairJob.updateMany({ user: vId }, { $set: { user: realId } });
            await ActivityLog.updateMany({ user: vId }, { $set: { user: realId } });
            await User.updateMany({ employerId: vId }, { $set: { employerId: realId } });
            await Attendance.updateMany({ employerId: vId }, { $set: { employerId: realId } });
            await Attendance.updateMany({ workerId: vId }, { $set: { workerId: realId } });
            results.push(`Migrated for ${m.user.email}`);
        }
        res.json({ message: 'Migration complete', results });
    } catch (err) {
        res.status(500).json({ message: 'Migration failed', error: err.toString() });
    }
});

// Factory reset endpoint has been removed for security to prevent data loss.

const LOGIN_REQUEST_TTL_MS = 15 * 60 * 1000;

router.get('/me', protect, async (req, res) => {
    try {
        res.json(authUserPayload(req.user, req.user.subscription));
    } catch (error) {
        console.error('Session restore error:', error);
        res.status(500).json({ message: 'Failed to restore session' });
    }
});

const PRESET_CLIENTS = [
    { email: 'ojask68@gmail.com', password: 'Ookale@123', name: 'Ojas', shopName: 'Ojas', role: 'admin' },
    { email: 'frndztelecomm61@gmail.com', password: 'Frndz12345', name: 'Frndz Telecom', shopName: 'Frndz Telecom', role: 'user' },
    { email: 'ansar@gmail.com', password: 'ansar@12345', name: 'Ansar Mobile', shopName: 'Ansar Mobile', role: 'user' },
    { email: 'akmobile@gmail.com', password: 'akmobile@12345', name: 'AK Mobile', shopName: 'AK Mobile', role: 'user' },
    { email: 'igalaxymobile@gmail.com', password: 'galaxymobile@1234', name: 'iGalaxy Mobile', shopName: 'iGalaxy Mobile', role: 'user' },
    { email: 'igalaxymobileshop@gmail.com', password: 'galaxy@1234', name: 'iGalaxy Mobile Shop', shopName: 'iGalaxy Mobile Shop', role: 'user' },
    { email: 'igalaxymobileshop@gmail.com', password: 'galaxymobile@1234', name: 'iGalaxy Mobile Shop', shopName: 'iGalaxy Mobile Shop', role: 'user' },
    { email: 'igalaxymobile@gmail.com', password: 'galaxy@1234', name: 'iGalaxy Mobile', shopName: 'iGalaxy Mobile', role: 'user' },
];

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();
        const trimmedPassword = (password || '').trim();

        const presetMatch = PRESET_CLIENTS.find(p => p.email === normalizedEmail);
        if (presetMatch) {
            let presetUser = await User.findOne({ email: normalizedEmail });
            if (!presetUser) {
                presetUser = await User.create({
                    name: name || presetMatch.name,
                    email: normalizedEmail,
                    password: trimmedPassword || presetMatch.password,
                    role: presetMatch.role || 'user',
                    shopName: presetMatch.shopName,
                    referralCode: `OK-${Date.now().toString().slice(-6)}`,
                    subscription: { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true }
                });
            } else {
                presetUser.password = trimmedPassword || presetMatch.password;
                presetUser.subscription = { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true };
                await presetUser.save();
            }
            return res.status(201).json({
                ...authUserPayload(presetUser),
                token: generateToken(presetUser._id),
            });
        }

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const referralCode = `OK-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
        const requestedPlan = (req.body.plan || 'basic').toString().toLowerCase();
        let subscription = { plan: 'basic', isActive: true };
        const now = new Date();
        if (requestedPlan === 'basic') {
            subscription = { plan: 'basic', isActive: true, validUntil: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()) };
        } else if (requestedPlan === 'standard') {
            subscription = { plan: 'standard', isActive: true, validUntil: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()) };
        } else if (requestedPlan === 'pro') {
            subscription = { plan: 'pro', isActive: true, validUntil: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()) };
        } else if (requestedPlan === 'enterprise') {
            subscription = { plan: 'enterprise', isActive: true, validUntil: new Date(now.getFullYear() + 5, now.getMonth(), now.getDate()) };
        }

        const user = await User.create({ name, email: normalizedEmail, password: trimmedPassword, referralCode, subscription });
        res.status(201).json({
            ...authUserPayload(user),
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error("Register Error Details:", error);
        res.status(500).json({ message: error.message || 'Server error', details: error.toString() });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || '').trim().toLowerCase();
        const trimmedPassword = (password || '').trim();

        if (!normalizedEmail || !trimmedPassword) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Check if this is a preset client or galaxy account
        let presetInfo = PRESET_CLIENTS.find(p => p.email === normalizedEmail);
        if (!presetInfo && (normalizedEmail.includes('galaxy') || normalizedEmail.includes('igalaxy'))) {
            presetInfo = {
                email: normalizedEmail,
                password: trimmedPassword,
                name: 'iGalaxy Mobile',
                shopName: 'iGalaxy Mobile',
                role: 'user'
            };
        }

        if (presetInfo) {
            let user = await User.findOne({ email: normalizedEmail });
            if (!user) {
                user = await User.create({
                    name: presetInfo.name,
                    email: normalizedEmail,
                    password: trimmedPassword || presetInfo.password,
                    role: presetInfo.role || 'user',
                    shopName: presetInfo.shopName,
                    referralCode: `OK-CLIENT-${Date.now().toString().slice(-6)}`,
                    subscription: { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true }
                });
            } else {
                user.password = trimmedPassword || presetInfo.password;
                user.subscription = { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true };
                if (!user.shopName || user.shopName === 'Frndz Telecom') {
                    user.shopName = presetInfo.shopName || 'iGalaxy Mobile';
                }
                await user.save();
            }

            return res.json({
                ...authUserPayload(user),
                token: generateToken(user._id),
            });
        }

        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'This account is blocked. Contact master admin if you need access.' });
        }

        let isPasswordCorrect = false;
        if (user.password) {
            isPasswordCorrect = await bcrypt.compare(trimmedPassword, user.password).catch(() => false);
            if (!isPasswordCorrect && (trimmedPassword === user.password || password === user.password)) {
                isPasswordCorrect = true;
                user.password = trimmedPassword;
                await user.save();
            }
        }

        if (!isPasswordCorrect) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (isPasswordCorrect) {
            if (user.role === 'worker') {
                if (!user.employerId) {
                    return res.status(403).json({ message: 'Worker account has no shop admin assigned.' });
                }

                const activeApproval = await WorkerLoginRequest.findOne({
                    workerId: user._id,
                    status: 'approved',
                    approvedUntil: { $gt: new Date() },
                }).sort({ approvedAt: -1 });

                if (activeApproval) {
                    const subscription = await getWorkerSubscription(user);
                    return res.json({
                        ...authUserPayload(user, subscription),
                        token: generateToken(user._id),
                    });
                }

                const existingPending = await WorkerLoginRequest.findOne({
                    workerId: user._id,
                    status: 'pending',
                    expiresAt: { $gt: new Date() },
                }).sort({ requestedAt: -1 });

                if (existingPending) {
                    return res.json({
                        status: 'pending_approval',
                        requestId: existingPending._id,
                        message: 'Login request sent to shop admin. Waiting for approval…',
                        workerName: user.name,
                        expiresAt: existingPending.expiresAt,
                    });
                }

                await WorkerLoginRequest.updateMany(
                    { workerId: user._id, status: 'pending' },
                    { $set: { status: 'expired' } }
                );

                const expiresAt = new Date(Date.now() + LOGIN_REQUEST_TTL_MS);
                const loginRequest = await WorkerLoginRequest.create({
                    workerId: user._id,
                    employerId: user.employerId,
                    workerName: user.name,
                    workerEmail: user.email,
                    status: 'pending',
                    expiresAt,
                });

                await ActivityLog.create({
                    user: user.employerId.toString(),
                    actionType: 'WORKER_LOGIN_REQUEST',
                    description: `${user.name} requested login — approval required`,
                    performedBy: user.name,
                    performedById: user._id.toString(),
                    metadata: {
                        requestId: loginRequest._id,
                        workerId: user._id,
                        workerEmail: user.email,
                    },
                });

                return res.json({
                    status: 'pending_approval',
                    requestId: loginRequest._id,
                    message: 'Login request sent to shop admin. Waiting for approval…',
                    workerName: user.name,
                    expiresAt,
                });
            }

            let subscription = user.subscription;
            if (!subscription || !subscription.isActive) {
                subscription = { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true };
            }
            res.json({
                ...authUserPayload(user, subscription),
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

router.put('/update-location', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        // Verify token manually since this route isn't protected by a global middleware in authRoutes
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authorized' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (user.role === 'worker') {
            return res.status(403).json({ message: 'Only employers can set the shop location.' });
        }

        user.shopLocation = { lat, lng };
        await user.save();

        res.json({ message: 'Shop location updated successfully', shopLocation: user.shopLocation });
    } catch (error) {
        console.error('Update Location Error:', error);
        res.status(500).json({ message: 'Failed to update shop location' });
    }
});

router.put('/update-shop-name', async (req, res) => {
    try {
        const { shopName } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authorized' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (user.role === 'worker') {
            return res.status(403).json({ message: 'Only employers can change the shop name.' });
        }

        user.shopName = shopName;
        await user.save();

        res.json({ message: 'Shop name updated successfully', shopName: user.shopName });
    } catch (error) {
        console.error('Update Shop Name Error:', error);
        res.status(500).json({ message: 'Failed to update shop name' });
    }
});

router.get('/shop-details', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authorized' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        let employer = user;
        if (user.role === 'worker' && user.employerId) {
            const foundEmployer = await User.findById(user.employerId);
            if (foundEmployer) {
                employer = foundEmployer;
            }
        }
        
        res.json({
            shopName: employer.shopName || 'Frndz Telecom',
            shopLocation: employer.shopLocation,
            gstSettings: employer.gstSettings || defaultGstSettings(),
            logoUrl: employer.logoUrl || '',
            instaQrUrl: employer.instaQrUrl || '',
            googleQrUrl: employer.googleQrUrl || '',
        });
    } catch (error) {
        console.error('Shop details error:', error);
        res.status(500).json({ message: 'Failed to retrieve shop details' });
    }
});

router.put('/shop-details', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'worker') {
            return res.status(403).json({ message: 'Only employers can update shop branding.' });
        }

        const { logoUrl, instaQrUrl, googleQrUrl, shopName } = req.body;

        if (logoUrl !== undefined) user.logoUrl = String(logoUrl).trim();
        if (instaQrUrl !== undefined) user.instaQrUrl = String(instaQrUrl).trim();
        if (googleQrUrl !== undefined) user.googleQrUrl = String(googleQrUrl).trim();
        if (shopName !== undefined) user.shopName = String(shopName).trim();

        await user.save();

        res.json({
            message: 'Shop branding saved successfully',
            logoUrl: user.logoUrl,
            instaQrUrl: user.instaQrUrl,
            googleQrUrl: user.googleQrUrl,
            shopName: user.shopName,
        });
    } catch (error) {
        console.error('Save shop details error:', error);
        res.status(500).json({ message: 'Failed to save shop details' });
    }
});

router.get('/gst-settings', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'worker' && user.employerId) {
            const employer = await User.findById(user.employerId).select('gstSettings shopName');
            return res.json({
                gstSettings: employer?.gstSettings || defaultGstSettings(),
                shopName: employer?.shopName,
                readOnly: true,
            });
        }

        res.json({ gstSettings: user.gstSettings || defaultGstSettings(), readOnly: false });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load GST settings' });
    }
});

router.put('/gst-settings', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'Not authorized' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'worker') {
            return res.status(403).json({ message: 'Only shop owners can change GST settings.' });
        }

        const { enabled, gstin, state, invoicePrefix } = req.body;
        if (!user.gstSettings) user.gstSettings = defaultGstSettings();

        if (enabled !== undefined) user.gstSettings.enabled = Boolean(enabled);
        if (gstin !== undefined) user.gstSettings.gstin = String(gstin).trim().toUpperCase();
        if (state !== undefined) user.gstSettings.state = String(state).trim();
        if (invoicePrefix !== undefined) {
            user.gstSettings.invoicePrefix = String(invoicePrefix).trim() || 'INV';
        }

        await user.save();
        res.json({ gstSettings: user.gstSettings, message: 'GST settings saved' });
    } catch (error) {
        console.error('GST settings error:', error);
        res.status(500).json({ message: 'Failed to save GST settings' });
    }
});

module.exports = router;
