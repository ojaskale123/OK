const express = require('express');
const router = express.Router();
const JobSheet = require('../models/JobSheet');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');
const { parsePagination } = require('../utils/pagination');

function resolveShopkeeperId(user) {
    return user.role === 'worker' ? user.employerId : user._id;
}

// Public endpoint to view job sheet by ID (No auth required for customer)
router.get('/public/:id', async (req, res) => {
    try {
        const jobSheet = await JobSheet.findById(req.params.id).populate('shopkeeperId', 'shopName phone contact shopAddress email logoUrl instaQrUrl googleQrUrl');
        if (!jobSheet) {
            return res.status(404).json({ message: 'Job Sheet not found' });
        }
        res.json(jobSheet);
    } catch (err) {
        console.error('Error fetching public job sheet:', err);
        res.status(500).json({ message: 'Failed to fetch job sheet' });
    }
});

// Create / Save Job Sheet (Requires Auth)
router.post('/', protect, async (req, res) => {
    try {
        const shopkeeperId = resolveShopkeeperId(req.user);
        const {
            jobNumber, jobDate, acceptanceTime, serviceCenterName, serviceCenterContact,
            serviceCenterAddress, serviceCenterEmail, serviceCenterTiming,
            customerName, customerPhone, customerPhone2, customerEmail, customerAddress,
            repairType, repairSenderInfo, productType, productInfo, productImei,
            deviceIssue, checklist, accessories, handsetAppearance, remarks,
            logoUrl, instaQrUrl, googleQrUrl
        } = req.body;

        if (!customerName || !customerPhone) {
            return res.status(400).json({ message: 'Customer Name and Customer Phone are required' });
        }

        const newJobSheet = await JobSheet.create({
            shopkeeperId,
            jobNumber: jobNumber || 'JS-0001',
            jobDate: jobDate || '',
            acceptanceTime: acceptanceTime || '',
            serviceCenterName: serviceCenterName || req.user.shopName || '',
            serviceCenterContact: serviceCenterContact || req.user.phone || '',
            serviceCenterAddress: serviceCenterAddress || req.user.shopAddress || '',
            serviceCenterEmail: serviceCenterEmail || req.user.email || '',
            serviceCenterTiming: serviceCenterTiming || '',
            customerName,
            customerPhone,
            customerPhone2: customerPhone2 || '',
            customerEmail: customerEmail || '',
            customerAddress: customerAddress || '',
            repairType: repairType || '',
            repairSenderInfo: repairSenderInfo || '',
            productType: productType || 'Mobile Phone',
            productInfo: productInfo || '',
            productImei: productImei || '',
            deviceIssue: deviceIssue || '',
            checklist: checklist || {},
            accessories: accessories || {},
            handsetAppearance: handsetAppearance || '',
            remarks: remarks || '',
            logoUrl: logoUrl || req.user.logoUrl || '',
            instaQrUrl: instaQrUrl || req.user.instaQrUrl || '',
            googleQrUrl: googleQrUrl || req.user.googleQrUrl || ''
        });

        // Log in Action History (ActivityLog)
        await ActivityLog.create({
            user: req.user.ownerId.toString(),
            actionType: 'JOB_SHEET_CREATE',
            description: `Job Sheet ${newJobSheet.jobNumber} created for ${newJobSheet.customerName}`,
            performedBy: req.user.name || 'Owner',
            performedById: req.user._id.toString(),
            metadata: {
                jobSheetId: newJobSheet._id.toString(),
                jobNumber: newJobSheet.jobNumber,
                customerName: newJobSheet.customerName,
                customerPhone: newJobSheet.customerPhone,
                productType: newJobSheet.productType,
                productInfo: newJobSheet.productInfo,
                productImei: newJobSheet.productImei,
                deviceIssue: newJobSheet.deviceIssue,
                repairType: newJobSheet.repairType,
                serviceCenterName: newJobSheet.serviceCenterName
            }
        });

        res.status(201).json(newJobSheet);
    } catch (err) {
        console.error('Error saving job sheet:', err);
        res.status(500).json({ message: 'Server error saving job sheet' });
    }
});

// Fetch all Job Sheets for current shopkeeper (Requires Auth)
router.get('/', protect, async (req, res) => {
    try {
        const shopkeeperId = resolveShopkeeperId(req.user);
        const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
        const filter = { shopkeeperId };

        const [items, total] = await Promise.all([
            JobSheet.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            JobSheet.countDocuments(filter)
        ]);

        res.json({ items, total, page, limit, hasMore: skip + items.length < total });
    } catch (err) {
        console.error('Error listing job sheets:', err);
        res.status(500).json({ message: 'Server error listing job sheets' });
    }
});

// Delete Job Sheet (Requires Auth)
router.delete('/:id', protect, async (req, res) => {
    try {
        const shopkeeperId = resolveShopkeeperId(req.user);
        const jobSheet = await JobSheet.findById(req.params.id);
        if (!jobSheet) return res.status(404).json({ message: 'Job sheet not found' });

        if (jobSheet.shopkeeperId.toString() !== shopkeeperId.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await JobSheet.findByIdAndDelete(req.params.id);
        res.json({ message: 'Job sheet deleted' });
    } catch (err) {
        console.error('Error deleting job sheet:', err);
        res.status(500).json({ message: 'Server error deleting job sheet' });
    }
});

module.exports = router;
