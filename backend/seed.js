require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/okerp', { serverSelectionTimeoutMS: 2000 })
.then(async () => {
    // Check if exists
    let user = await User.findOne({ email: 'ojask68@gmail.com' });
    
    if (!user) {
        user = await User.create({
            name: 'Ojas (Admin)',
            email: 'ojask68@gmail.com',
            password: 'Ookale@123', 
            role: 'admin',
            walletBalance: 99999,
            subscription: {
                plan: 'Retail Pro',
                validUntil: new Date("2099-12-31"),
                isActive: true
            }
        });
        console.log("SUCCESS_CREATED");
    } else {
        user.subscription = { plan: 'Retail Pro', validUntil: new Date("2099-12-31"), isActive: true };
        user.password = 'Ookale@123';
        user.role = 'admin';
        await user.save();
        console.log("SUCCESS_UPDATED");
    }
    process.exit(0);
})
.catch(err => {
    console.error("DB_ERROR: " + err.message);
    process.exit(1);
});
