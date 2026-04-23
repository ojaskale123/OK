const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (decoded.id === 'master-admin-id') {
                req.user = {
                    _id: '000000000000000000000000', // Valid Hex ObjectId
                    name: 'Ojas (Testing Demo)',
                    subscription: { plan: 'Retail Pro', isActive: true },
                    walletBalance: 0,
                    role: 'admin'
                };
                return next();
            }

            req.user = await User.findById(decoded.id).select('-password');
            if (req.user) {
                if (req.user.role === 'worker' && req.user.employerId) {
                    req.user.ownerId = req.user.employerId;
                    if (req.user.employerId.toString() === '000000000000000000000000') {
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
            }
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
