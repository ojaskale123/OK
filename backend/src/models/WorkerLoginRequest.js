const mongoose = require('mongoose');

const workerLoginRequestSchema = new mongoose.Schema({
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workerName: { type: String, required: true },
    workerEmail: { type: String, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'denied', 'expired'],
        default: 'pending',
    },
    requestedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    approvedAt: { type: Date },
    approvedUntil: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    loginToken: { type: String },
}, { timestamps: true });

workerLoginRequestSchema.index({ employerId: 1, status: 1, requestedAt: -1 });
workerLoginRequestSchema.index({ workerId: 1, status: 1 });

module.exports = mongoose.model('WorkerLoginRequest', workerLoginRequestSchema);
