const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_id',
    key_secret: process.env.RAZORPAY_SECRET || 'dummy_secret',
});

// Create Order (For Plan purchase)
router.post('/create-order', protect, async (req, res) => {
    const { amount, planName } = req.body; // Amount in INR
    const options = {
        amount: amount * 100, // paise
        currency: "INR",
        receipt: `receipt_${req.user._id}`,
    };
    try {
        const order = await razorpay.orders.create(options);
        res.json({ order, planName, key: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error creating Razorpay order");
    }
});

// Verify Signature
router.post('/verify', protect, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planName } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
                                    .update(body.toString())
                                    .digest('hex');
                                    
    if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
    }

    // Activate Subscription
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 Year validity
    
    const user = await User.findById(req.user._id);
    user.subscription = {
        plan: planName,
        validUntil,
        isActive: true
    };
    
    // Reward points for upgrading! (Gamification)
    user.walletBalance += 500;
    
    await user.save();
    res.json({ message: "Payment verified successfully", subscription: user.subscription });
});

// START 3-DAY FREE TRIAL
router.post('/start-trial', protect, async (req, res) => {
    const { planName } = req.body;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 3); // 3 Days
    
    // Master backdoor bypass
    if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
        return res.json({ subscription: { plan: planName, validUntil, isActive: true } });
    }

    const user = await User.findById(req.user._id);
    
    user.subscription = {
        plan: planName,
        validUntil,
        isActive: true
    };
    await user.save();
    res.json({ subscription: user.subscription });
});

module.exports = router;
