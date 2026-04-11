const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: { type: String, required: true }, // Using String to accommodate 'master-admin-id'
    actionType: { 
        type: String, 
        enum: ['POS_BILL', 'PRODUCT_ADD', 'PRODUCT_EDIT', 'CASHBOOK_PERSON_ADD', 'CASHBOOK_TXN_ADD'],
        required: true
    },
    description: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
