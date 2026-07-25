const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Product = require('./src/models/Product');
const Bill = require('./src/models/Bill');
const CashbookPerson = require('./src/models/CashbookPerson');
const CashbookTransaction = require('./src/models/CashbookTransaction');
const RepairJob = require('./src/models/RepairJob');
const ActivityLog = require('./src/models/ActivityLog');
const Attendance = require('./src/models/Attendance');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/okerp';

async function migrateData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const master1 = await User.findOne({ email: 'ojask68@gmail.com' });
        const master2 = await User.findOne({ email: 'frndztelecomm61@gmail.com' });

        const migrations = [
            { user: master1, virtualId: '000000000000000000000000' },
            { user: master2, virtualId: '111111111111111111111111' }
        ];

        for (const m of migrations) {
            if (!m.user) {
                console.log(`Master user not found for virtual ID ${m.virtualId}`);
                continue;
            }

            const realId = m.user._id;
            const vId = m.virtualId;

            console.log(`Migrating data from ${vId} to ${realId} for ${m.user.email}`);

            const productRes = await Product.updateMany({ user: vId }, { $set: { user: realId } });
            console.log(`Updated ${productRes.modifiedCount} Products`);

            const billRes = await Bill.updateMany({ user: vId }, { $set: { user: realId } });
            console.log(`Updated ${billRes.modifiedCount} Bills`);

            const cbPersonRes = await CashbookPerson.updateMany({ user: vId }, { $set: { user: realId } });
            console.log(`Updated ${cbPersonRes.modifiedCount} CashbookPersons`);

            const cbTransRes = await CashbookTransaction.updateMany({ user: vId }, { $set: { user: realId } });
            console.log(`Updated ${cbTransRes.modifiedCount} CashbookTransactions`);

            const repairRes = await RepairJob.updateMany({ user: vId }, { $set: { user: realId } });
            console.log(`Updated ${repairRes.modifiedCount} RepairJobs`);

            const activityRes = await ActivityLog.updateMany({ user: vId }, { $set: { user: realId } });
            console.log(`Updated ${activityRes.modifiedCount} ActivityLogs`);

            const workerRes = await User.updateMany({ employerId: vId }, { $set: { employerId: realId } });
            console.log(`Updated ${workerRes.modifiedCount} Workers (employerId)`);

            const attendanceRes = await Attendance.updateMany({ employerId: vId }, { $set: { employerId: realId } });
            console.log(`Updated ${attendanceRes.modifiedCount} Attendance records (employerId)`);
            
            const attendanceWorkerRes = await Attendance.updateMany({ workerId: vId }, { $set: { workerId: realId } });
            console.log(`Updated ${attendanceWorkerRes.modifiedCount} Attendance records (workerId)`);
        }

        console.log("Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrateData();
