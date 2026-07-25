const { google } = require('googleapis');
const path = require('path');
const stream = require('stream');

const fs = require('fs');

// Initialize the Google Drive API client
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// The path to your credentials.json file
const CREDENTIALS_PATH = path.join(__dirname, '../../credentials.json');

let authOptions = { scopes: SCOPES };

if (process.env.GOOGLE_CREDENTIALS) {
    authOptions.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
} else if (fs.existsSync(CREDENTIALS_PATH)) {
    authOptions.keyFile = CREDENTIALS_PATH;
} else {
    console.error("WARNING: No Google Credentials found. Drive uploads will fail.");
}

const auth = new google.auth.GoogleAuth(authOptions);

const drive = google.drive({ version: 'v3', auth });

/**
 * Uploads a base64 encoded image to Google Drive
 * @param {string} base64String The base64 image string from the frontend
 * @param {string} folderId The Google Drive Folder ID
 * @param {string} fileName The name to save the file as
 * @returns {Promise<string>} The Google Drive File ID or Web View Link
 */
async function uploadBase64ToDrive(base64String, folderId, fileName = 'selfie.jpg') {
    try {
        // Remove the data:image/jpeg;base64, prefix if it exists
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create a readable stream from the buffer
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        
        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };
        
        const media = {
            mimeType: 'image/jpeg',
            body: bufferStream
        };
        
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink'
        });
        
        // Make the file publicly accessible so it can be viewed in the app
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });
        
        // Thumbnail URL works reliably in browser <img> tags
        return `https://drive.google.com/thumbnail?id=${file.data.id}&sz=w800`;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw new Error('Failed to upload image to Google Drive');
    }
}

module.exports = {
    uploadBase64ToDrive
};
