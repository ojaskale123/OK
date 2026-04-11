const mongoose = require('mongoose');

const cashbookPersonSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    contact: { type: String },
    // Positive means they owe user(Green). Negative means user owes them(Red).
    netBalance: { type: Number, default: 0 } 
}, { timestamps: true });

module.exports = mongoose.model('CashbookPerson', cashbookPersonSchema);
