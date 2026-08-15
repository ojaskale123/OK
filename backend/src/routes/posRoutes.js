const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');
const { aggregateBillTax, productHasGst } = require('../utils/gstCalculator');

function normalizeReceiptImage(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('data:image')) {
        const comma = trimmed.indexOf(',');
        return comma >= 0 ? trimmed.slice(comma + 1) : null;
    }
    return trimmed;
}

async function getNextInvoiceNumber(ownerId) {
    const user = await User.findByIdAndUpdate(
        ownerId,
        { $inc: { 'gstSettings.invoiceCounter': 1 } },
        { new: true }
    );
    const prefix = (user?.gstSettings?.invoicePrefix || 'INV').replace(/-+$/, '');
    const num = user?.gstSettings?.invoiceCounter || 1;
    return `${prefix}-${String(num).padStart(5, '0')}`;
}

router.post('/', protect, async (req, res) => {
    try {
        const { canAccessFeature } = require('../utils/planUtils');
        const plan = req.user.subscription?.plan || 'basic';
        if (!canAccessFeature(plan, 'pos')) {
            return res.status(403).json({ message: 'Your plan does not include POS. Please upgrade.' });
        }
        const {
            customerName,
            customerPhone,
            customerGstin,
            items,
            subtotal,
            discountApplied,
            finalTotal,
            paymentMode,
            receiptImage,
        } = req.body;

        const ownerId = req.user.ownerId;
        const employer = await User.findById(ownerId).select('gstSettings shopName').lean();

        let billPayload = {
            user: ownerId,
            customerName,
            customerPhone,
            customerGstin: customerGstin || '',
            discountApplied: discountApplied || 0,
            paymentMode,
            gstEnabled: false,
            placeOfSupply: employer?.gstSettings?.state || '',
        };

        if (items && items.length > 0) {
            const productIds = items.map((i) => i.product).filter(Boolean);
            const products = await Product.find({ _id: { $in: productIds }, user: ownerId }).lean();
            const productMap = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

            const linesForTax = items.map((item) => {
                const prod = item.product ? productMap[item.product.toString()] : null;
                const applyGst = item.applyGst !== undefined ? Boolean(item.applyGst) : productHasGst(prod);
                const hsn = prod?.hsn || item.hsn || '8517';
                const lineTotal = Number(item.total) || Number(item.price) * Number(item.quantity);
                return {
                    product: item.product,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: lineTotal,
                    applyGst,
                    hsn,
                    imei1: item.imei1 || '',
                    imei2: item.imei2 || '',
                    category: item.category || prod?.category || 'Others',
                };
            });

            const tax = aggregateBillTax(linesForTax);

            if (tax.hasGst) {
                const invoiceNumber = await getNextInvoiceNumber(ownerId);
                billPayload = {
                    ...billPayload,
                    gstEnabled: true,
                    invoiceNumber,
                    items: tax.items,
                    subtotal: tax.finalTotal,
                    taxableAmount: tax.taxableAmount,
                    gstAmount: tax.gstAmount,
                    cgstAmount: tax.cgstAmount,
                    sgstAmount: tax.sgstAmount,
                    igstAmount: tax.igstAmount,
                    finalTotal: tax.finalTotal - (discountApplied || 0),
                };
            } else {
                billPayload = {
                    ...billPayload,
                    items: items.map(item => ({
                        product: item.product,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.total,
                        applyGst: item.applyGst || false,
                        hsn: item.hsn || '8517',
                        imei1: item.imei1 || '',
                        imei2: item.imei2 || '',
                        category: item.category || 'Others',
                    })),
                    subtotal,
                    taxableAmount: subtotal,
                    gstAmount: 0,
                    cgstAmount: 0,
                    sgstAmount: 0,
                    igstAmount: 0,
                    finalTotal,
                };
            }
        } else {
            billPayload = {
                ...billPayload,
                items,
                subtotal,
                taxableAmount: subtotal,
                gstAmount: 0,
                cgstAmount: 0,
                sgstAmount: 0,
                igstAmount: 0,
                finalTotal,
            };
        }

        const storedReceiptImage = normalizeReceiptImage(receiptImage);
        if (storedReceiptImage) {
            billPayload.receiptImage = storedReceiptImage;
        }

        const bill = await Bill.create(billPayload);

        if (items && Array.isArray(items)) {
            const bulkOps = items
                .filter((item) => item.product)
                .map((item) => {
                    const updateObj = { $inc: { stockQuantity: -item.quantity } };
                    if (item.imei1 !== undefined || item.imei2 !== undefined) {
                        updateObj.$set = {};
                        if (item.imei1 !== undefined) updateObj.$set.imei1 = item.imei1;
                        if (item.imei2 !== undefined) updateObj.$set.imei2 = item.imei2;
                    }
                    return {
                        updateOne: {
                            filter: { _id: item.product },
                            update: updateObj,
                        },
                    };
                });
            if (bulkOps.length > 0) {
                await Product.bulkWrite(bulkOps);
            }
        }

        await ActivityLog.create({
            user: ownerId.toString(),
            actionType: 'POS_BILL',
            description: bill.gstEnabled
                ? `Tax invoice ${bill.invoiceNumber} for ${customerName}`
                : `Created Bill for ${customerName}`,
            performedBy: req.user.name || 'Owner',
            performedById: req.user._id.toString(),
            metadata: {
                billId: bill._id,
                invoiceNumber: bill.invoiceNumber,
                finalTotal: bill.finalTotal,
                customerName,
                customerPhone,
                gstEnabled: bill.gstEnabled,
            },
        });

        if (typeof req.user.save === 'function') {
            req.user.walletBalance = (req.user.walletBalance || 0) + 5;
            await req.user.save();
        }

        res.status(201).json(bill);
    } catch (err) {
        console.error('POS bill error:', err);
        res.status(500).json({ error: 'Failed to create POS Bill' });
    }
});

router.get('/', protect, async (req, res) => {
    const { parsePagination } = require('../utils/pagination');
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 200 });
    const filter = { user: req.user.ownerId };

    const [bills, total] = await Promise.all([
        Bill.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
        Bill.countDocuments(filter),
    ]);

    res.json({ items: bills, total, page, limit, hasMore: skip + bills.length < total });
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id);
        if (!bill || bill.user.toString() !== req.user.ownerId.toString()) {
            return res.status(401).json({ message: 'Not authorized or bill not found' });
        }

        if (bill.items && Array.isArray(bill.items)) {
            const bulkOps = bill.items
                .filter((item) => item.product)
                .map((item) => ({
                    updateOne: {
                        filter: { _id: item.product },
                        update: { $inc: { stockQuantity: item.quantity } },
                    },
                }));
            if (bulkOps.length > 0) {
                await Product.bulkWrite(bulkOps);
            }
        }

        await Bill.findByIdAndDelete(req.params.id);
        res.json({ message: 'Bill deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error deleting bill' });
    }
});

router.get('/public/:id', async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id)
            .populate('user', 'shopName gstSettings')
            .lean();
        if (bill) {
            return res.json(bill);
        }
        res.status(404).json({ message: 'Receipt not found' });
    } catch (error) {
        console.error('Error fetching public receipt:', error);
        res.status(500).json({ message: 'Server error fetching receipt' });
    }
});

router.get('/public/:id/image', async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id).select('receiptImage').lean();
        if (!bill?.receiptImage) {
            return res.status(404).json({ message: 'Receipt image not found' });
        }
        const buffer = Buffer.from(bill.receiptImage, 'base64');
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=604800');
        return res.send(buffer);
    } catch (error) {
        console.error('Error fetching receipt image:', error);
        return res.status(500).json({ message: 'Server error fetching receipt image' });
    }
});

module.exports = router;
