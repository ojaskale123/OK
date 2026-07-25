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

    const clientSeeds = [
        {
            name: 'Ansar',
            email: 'ansar@gmail.com',
            password: 'ansar@12345',
            role: 'user',
            walletBalance: 5000,
            referralCode: 'ANSAR-1001',
            subscription: {
                plan: 'Shopkeeper',
                validUntil: new Date('2099-12-31'),
                isActive: true
            },
            shopName: 'Ansar Store',
            gstSettings: {
                enabled: false,
                gstin: '',
                state: '',
                invoicePrefix: 'INV',
                invoiceCounter: 0
            }
        },
        {
            name: 'AK Mobile',
            email: 'akmobile@gmail.com',
            password: 'akmobile@12345',
            role: 'user',
            walletBalance: 7500,
            referralCode: 'AKMOB-1002',
            subscription: {
                plan: 'Shopkeeper',
                validUntil: new Date('2099-12-31'),
                isActive: true
            },
            shopName: 'AK Mobile Store',
            gstSettings: {
                enabled: false,
                gstin: '',
                state: '',
                invoicePrefix: 'INV',
                invoiceCounter: 0
            }
        },
        {
            name: 'iGalaxy Mobile',
            email: 'igalaxymobile@gmail.com',
            password: 'galaxymobile@1234',
            role: 'user',
            walletBalance: 2500,
            referralCode: 'IGALAXY-1004',
            subscription: {
                plan: 'Retail Pro',
                validUntil: new Date('2099-12-31'),
                isActive: true
            },
            shopName: 'iGalaxy Mobile',
            gstSettings: {
                enabled: false,
                gstin: '',
                state: '',
                invoicePrefix: 'INV',
                invoiceCounter: 0
            }
        },
        {
            name: 'i galaxy mobile shop',
            email: 'igalaxymobileshop@gmail.com',
            password: 'galaxy@1234',
            role: 'user',
            walletBalance: 2500,
            referralCode: 'IGALAXY-1003',
            subscription: {
                plan: 'Shopkeeper',
                validUntil: new Date('2099-12-31'),
                isActive: true
            },
            shopName: 'i galaxy mobile shop',
            gstSettings: {
                enabled: false,
                gstin: '',
                state: '',
                invoicePrefix: 'INV',
                invoiceCounter: 0
            }
        }
    ];

    for (const clientData of clientSeeds) {
        let client = await User.findOne({ email: clientData.email });
        if (!client) {
            client = await User.create(clientData);
            console.log(`CLIENT_CREATED: ${clientData.email}`);
        } else {
            Object.assign(client, clientData);
            await client.save();
            console.log(`CLIENT_UPDATED: ${clientData.email}`);
        }
    }

    process.exit(0);
})
.catch(err => {
    console.error("DB_ERROR: " + err.message);
    process.exit(1);
});
