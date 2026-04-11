const mongoose = require('mongoose');

const cashbookTransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    person: { type: mongoose.Schema.Types.ObjectId, ref: 'CashbookPerson', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['give', 'receive'], required: true },
    note: { type: String },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('CashbookTransaction', cashbookTransactionSchema);
