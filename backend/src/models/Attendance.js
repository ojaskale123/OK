const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD format for easy querying
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    status: { type: String, enum: ['Present', 'Absent', 'Half Day'], default: 'Present' },
    checkInLocation: {
        lat: Number,
        lng: Number,
        distanceFromShop: Number // in meters
    }
}, { timestamps: true });

// Ensure a worker can only have one attendance record per day
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
