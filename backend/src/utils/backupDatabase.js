const mongoose = require('mongoose');
const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

const fs = require('fs');

// The path to your credentials.json file
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

let authOptions = { scopes: SCOPES };

if (process.env.GOOGLE_CREDENTIALS) {
    authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} else if (fs.existsSync(CREDENTIALS_PATH)) {
    authOptions.keyFile = CREDENTIALS_PATH;
} else {
    console.error("WARNING: No Google Credentials found. Database backup will fail.");
}

const auth = new google.auth.GoogleAuth(authOptions);

const drive = google.drive({ version: 'v3', auth });

async function backupDatabaseToDrive() {
    try {
        console.log('Starting automated database backup...');
        
        // Ensure MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('Connecting to MongoDB for backup...');
            if (!process.env.MONGODB_URI) {
                console.error('Error: MONGODB_URI is not set in environment.');
                return;
            }
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            console.error('Error: GOOGLE_DRIVE_FOLDER_ID is missing in .env file');
            return;
        }

        // Get all collections from the database dynamically
        const collections = await mongoose.connection.db.collections();
        const backupData = {};

        // Export each collection to the backupData object
        for (let collection of collections) {
            const collectionName = collection.collectionName;
            console.log(`Dumping collection: ${collectionName}`);
            const docs = await collection.find({}).toArray();
            backupData[collectionName] = docs;
        }

        // Convert the full backup object to a JSON string
        const jsonString = JSON.stringify(backupData, null, 2);
        
        // Convert the JSON string to a readable stream
        const bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(jsonString));
        
        const fileName = `okerp_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

        console.log(`Uploading backup to Google Drive as ${fileName}...`);

        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };
        
        const media = {
            mimeType: 'application/json',
            body: bufferStream
        };
        
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });

        console.log(`Backup successfully uploaded to Google Drive! File ID: ${file.data.id}`);
        return file.data.id;
    } catch (err) {
        console.error('Database backup failed:', err);
        throw err;
    }
}

module.exports = { backupDatabaseToDrive };

// If this file is run directly (e.g., node backupDatabase.js), execute it immediately
if (require.main === module) {
    const dotenv = require('dotenv');
    dotenv.config({ path: '../../.env' });
    backupDatabaseToDrive().then(() => {
        console.log('Backup script completed.');
        process.exit(0);
    }).catch(() => {
        process.exit(1);
    });
}
