const mongoose = require('mongoose');

const repairJobSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    deviceModel: { type: String, required: true },
    issue: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['Collected', 'Assigned', 'In Repair', 'Ready', 'Completed'], 
        default: 'Collected' 
    },
    costing: { type: Number, default: 0 },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    shopkeeperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('RepairJob', repairJobSchema);
