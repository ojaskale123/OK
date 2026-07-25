const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ok-erp-live-secret';
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });

/** After admin approves, worker can log in freely for this long without re-approval */
const LOGIN_APPROVAL_WINDOW_MS = 5 * 60 * 1000;

const defaultGstSettings = () => ({
    enabled: false,
    gstin: '',
    state: '',
    invoicePrefix: 'INV',
    invoiceCounter: 0,
});

const authUserPayload = (user, subscription) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscription: subscription || user.subscription || {
        plan: 'Shopkeeper',
        validUntil: new Date('2099-12-31'),
        isActive: true,
    },
    walletBalance: user.walletBalance || 0,
    shopName: user.shopName || 'Frndz Telecom',
    gstSettings: user.gstSettings || defaultGstSettings(),
    logoUrl: user.logoUrl || '',
    instaQrUrl: user.instaQrUrl || '',
    googleQrUrl: user.googleQrUrl || '',
});

async function getWorkerSubscription(worker) {
    if (!worker.employerId) return worker.subscription;
    if (worker.employerId.toString() === '000000000000000000000000') {
        return { plan: 'Retail Pro', validUntil: new Date('2099-12-31'), isActive: true };
    }
    const employer = await User.findById(worker.employerId).select('subscription').lean();
    return employer?.subscription || worker.subscription;
}

module.exports = {
    generateToken,
    defaultGstSettings,
    authUserPayload,
    getWorkerSubscription,
    LOGIN_APPROVAL_WINDOW_MS,
};
