const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uris = [
  'mongodb+srv://ojask68_db_user:5OJthMWhoo32BTGV@cluster0.zwakdg8.mongodb.net/ok_erp?retryWrites=true&w=majority',
  'mongodb+srv://ojask68_db_user:50JthMWhoo32BTGV@cluster0.zwakdg8.mongodb.net/ok_erp?retryWrites=true&w=majority',
  'mongodb://127.0.0.1:27017/okerp'
];

async function run() {
  for (let uri of uris) {
    try {
      console.log('Trying to connect to', uri.split('@')[1] || 'local');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to', uri.split('@')[1] || 'local');
      
      const db = mongoose.connection.db;
      const collections = await db.collections();
      for (let collection of collections) {
         try {
             await collection.drop();
         } catch(err) {
             console.log("Could not drop collection", collection.collectionName);
         }
      }
      console.log('Cleared database successfully for', uri.split('@')[1] || 'local');
      
      const User = require('./src/models/User'); // Use the exact predefined model
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Frndz@1234', salt);
      
      await User.create({
          name: 'Frndz Telecom',
          email: 'frndztelecom61@gmail.com',
          password: hashedPassword,
          role: 'admin',
          walletBalance: 0,
          subscription: {
              plan: 'Retail Pro',
              validUntil: new Date("2099-12-31"),
              isActive: true
          }
      });
      console.log('Client saved successfully for', uri.split('@')[1] || 'local');
      await mongoose.disconnect();
    } catch (e) {
      console.log('Failed for', uri.split('@')[1] || 'local', '-', e.message);
    }
  }
}

run().then(() => {
    console.log("Script Complete.");
    process.exit(0);
});
