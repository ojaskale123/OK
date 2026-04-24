const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        let decoded;
        try {
            token = req.headers.authorization.split(' ')[1];
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
            
        if (decoded.id === 'master-admin-id' || decoded.id === 'master-admin-id-2') {
            const isFirst = decoded.id === 'master-admin-id';
            req.user = {
                _id: isFirst ? '000000000000000000000000' : '111111111111111111111111',
                ownerId: isFirst ? '000000000000000000000000' : '111111111111111111111111',
                name: isFirst ? 'Ojas (Testing Demo)' : 'Frndz Telecom (Testing Demo)',
                subscription: { plan: 'Retail Pro', isActive: true },
                walletBalance: 0,
                role: 'admin'
            };
            return next();
        }

        try {
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found. Please login again.' });
            }
            if (req.user.role === 'worker' && req.user.employerId) {
                req.user.ownerId = req.user.employerId;
                if (req.user.employerId.toString() === '000000000000000000000000' || req.user.employerId.toString() === '111111111111111111111111') {
                    req.user.subscription = { plan: 'Retail Pro', isActive: true };
                } else {
                    const employer = await User.findById(req.user.employerId).select('subscription');
                    if (employer) {
                        req.user.subscription = employer.subscription;
                    }
                }
            } else {
                req.user.ownerId = req.user._id;
            }
            next();
        } catch (error) {
            return res.status(500).json({ message: 'Server error during authentication', details: error.message });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
