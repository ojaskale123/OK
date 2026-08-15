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
async function uploadBase64ToDrive(base64String, folderId, fileName = 'selfie.png') {
    try {
        // Accept any data URI (image/* or application/pdf etc.)
        const mimeMatch = base64String.match(/^data:([^;]+);base64,/i);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const base64Data = base64String.replace(/^data:[^;]+;base64,/, '');
        
        const buffer = Buffer.from(base64Data, 'base64');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer);
        
        const fileMetadata = {
            name: fileName,
            parents: [folderId]
        };
        
        const media = {
            mimeType,
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
        
        const publicLink = file.data.webViewLink || `https://drive.google.com/file/d/${file.data.id}/view?usp=sharing`;
        return publicLink;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw new Error('Failed to upload image to Google Drive');
    }
}

module.exports = {
    uploadBase64ToDrive
};
