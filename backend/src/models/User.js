const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'worker'], default: 'user' },
    walletBalance: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Subscription details embedded for easy access
    subscription: {
        plan: { type: String, enum: ['None', 'Shopkeeper', 'Wholesale', 'Retail Pro'], default: 'None' },
        validUntil: { type: Date },
        isActive: { type: Boolean, default: false }
    },
    shopLocation: {
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String }
    }
}, { timestamps: true });

// Password hashing middleware
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

module.exports = mongoose.model('User', userSchema);
