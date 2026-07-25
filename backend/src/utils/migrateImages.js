const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { uploadBase64ToDrive } = require('./googleDrive');
const Product = require('../models/Product');
const Attendance = require('../models/Attendance');

// Load env vars
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateImages() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            console.error('Error: GOOGLE_DRIVE_FOLDER_ID is missing in .env file');
            process.exit(1);
        }

        console.log('Starting migration for Products...');
        // Find products where image starts with data:image (which means it is base64)
        const products = await Product.find({ image: { $regex: '^data:image' } });
        console.log(`Found ${products.length} products with base64 images.`);

        for (const product of products) {
            try {
                console.log(`Migrating product image: ${product.name} (ID: ${product._id})`);
                const driveLink = await uploadBase64ToDrive(product.image, folderId, `migrated_product_${product._id}.jpg`);
                product.image = driveLink;
                await product.save();
                console.log(`Successfully migrated image for product: ${product.name}`);
            } catch (err) {
                console.error(`Failed to migrate image for product ${product._id}:`, err.message);
            }
        }

        console.log('Starting migration for Attendance...');
        // Find attendance where checkInSelfie starts with data:image
        const attendances = await Attendance.find({ checkInSelfie: { $regex: '^data:image' } });
        console.log(`Found ${attendances.length} attendance records with base64 selfies.`);

        for (const attendance of attendances) {
            try {
                console.log(`Migrating attendance selfie for worker ${attendance.workerId} (Date: ${attendance.date})`);
                const driveLink = await uploadBase64ToDrive(attendance.checkInSelfie, folderId, `migrated_selfie_${attendance.workerId}_${Date.now()}.jpg`);
                attendance.checkInSelfie = driveLink;
                await attendance.save();
                console.log(`Successfully migrated selfie for worker: ${attendance.workerId}`);
            } catch (err) {
                console.error(`Failed to migrate selfie for attendance ${attendance._id}:`, err.message);
            }
        }

        console.log('Migration completed successfully! Your database is now clean.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrateImages();
