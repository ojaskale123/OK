const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: { type: String, required: true }, // Using String to accommodate 'master-admin-id'
    actionType: { 
        type: String, 
        enum: ['POS_BILL', 'PRODUCT_ADD', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'CASHBOOK_PERSON_ADD', 'CASHBOOK_TXN_ADD', 'WORKER_ADD', 'REPAIR_JOB_ADD', 'REPAIR_JOB_COMPLETE', 'ATTENDANCE_CHECK_IN', 'ATTENDANCE_CHECK_OUT', 'ATTENDANCE_BREAK', 'GEOFENCE_BREACH', 'WORKER_LOGIN_REQUEST', 'WORKER_LOGIN_APPROVED', 'WORKER_LOGIN_DENIED'],
        required: true
    },
    description: { type: String, required: true },
    performedBy: { type: String, default: 'Owner' },
    performedById: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

activityLogSchema.index({ user: 1, date: -1 });
activityLogSchema.index({ user: 1, actionType: 1, date: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
