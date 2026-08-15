const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

function csvEscape(val) {
    const s = val == null ? '' : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function csvRow(cells) {
    return cells.map(csvEscape).join(',');
}

router.get('/export', protect, async (req, res) => {
    try {
        const { canAccessFeature } = require('../utils/planUtils');
        const plan = req.user.subscription?.plan || 'basic';
        if (!canAccessFeature(plan, 'gst')) return res.status(403).json({ message: 'Your plan does not include GST exports. Please upgrade.' });
        if (req.user.role === 'worker') {
            return res.status(403).json({ message: 'Only shop owners can export GST reports.' });
        }

        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
        if (month < 1 || month > 12) {
            return res.status(400).json({ message: 'Invalid month' });
        }

        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);

        const ownerId = req.user.ownerId || req.user._id;
        const employer = await User.findById(ownerId).select('shopName gstSettings');
        const bills = await Bill.find({
            user: ownerId,
            gstEnabled: true,
            date: { $gte: start, $lt: end },
        }).sort({ date: 1 }).lean();

        const lines = [];
        const bom = '\uFEFF';

        lines.push('OK ERP — GST-1 Sales Export (GSTR-1 helper)');
        lines.push(`Shop,${csvEscape(employer?.shopName || '')}`);
        lines.push(`GSTIN,${csvEscape(employer?.gstSettings?.gstin || '')}`);
        lines.push(`Period,${month.toString().padStart(2, '0')}-${year}`);
        lines.push('');

        lines.push('=== INVOICE SUMMARY ===');
        lines.push(csvRow([
            'Invoice No', 'Date', 'Customer', 'Phone', 'Payment',
            'Taxable (₹)', 'CGST (₹)', 'SGST (₹)', 'Total GST (₹)', 'Invoice Total (₹)',
        ]));

        const hsnMap = {};

        bills.forEach((b) => {
            const d = new Date(b.date).toLocaleDateString('en-IN');
            lines.push(csvRow([
                b.invoiceNumber || b._id.toString().slice(-6),
                d,
                b.customerName,
                b.customerPhone || '',
                b.paymentMode,
                b.taxableAmount ?? b.subtotal,
                b.cgstAmount ?? 0,
                b.sgstAmount ?? 0,
                b.gstAmount ?? 0,
                b.finalTotal,
            ]));

            (b.items || []).forEach((item) => {
                const key = `${item.hsn || '8517'}|${item.gstRate ?? 0}`;
                if (!hsnMap[key]) {
                    hsnMap[key] = { hsn: item.hsn || '8517', rate: item.gstRate ?? 0, taxable: 0, gst: 0 };
                }
                hsnMap[key].taxable += item.taxableValue || 0;
                hsnMap[key].gst += item.gstAmount || 0;
            });
        });

        lines.push('');
        lines.push('=== LINE ITEMS ===');
        lines.push(csvRow([
            'Invoice No', 'Date', 'Customer', 'Item', 'HSN', 'Qty', 'Rate (₹)', 'GST %',
            'Taxable (₹)', 'CGST (₹)', 'SGST (₹)', 'Line Total (₹)',
        ]));

        bills.forEach((b) => {
            const d = new Date(b.date).toLocaleDateString('en-IN');
            const inv = b.invoiceNumber || b._id.toString().slice(-6);
            (b.items || []).forEach((item) => {
                lines.push(csvRow([
                    inv, d, b.customerName, item.name, item.hsn || '8517', item.quantity,
                    item.price, item.gstRate ?? 0,
                    item.taxableValue ?? 0, item.cgstAmount ?? 0, item.sgstAmount ?? 0, item.total,
                ]));
            });
        });

        lines.push('');
        lines.push('=== HSN SUMMARY ===');
        lines.push(csvRow(['HSN', 'GST %', 'Taxable (₹)', 'Total GST (₹)']));
        Object.values(hsnMap).forEach((row) => {
            lines.push(csvRow([
                row.hsn,
                row.rate,
                Math.round(row.taxable * 100) / 100,
                Math.round(row.gst * 100) / 100,
            ]));
        });

        lines.push('');
        lines.push('Note: GST-2 (purchases) is not included. Use supplier bills for purchase return.');

        const filename = `OK_ERP_GST1_${year}_${String(month).padStart(2, '0')}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(bom + lines.join('\r\n'));
    } catch (err) {
        console.error('GST export error:', err);
        res.status(500).json({ message: 'Failed to export GST report' });
    }
});

router.get('/summary', protect, async (req, res) => {
    try {
        const { canAccessFeature } = require('../utils/planUtils');
        const plan = req.user.subscription?.plan || 'basic';
        if (!canAccessFeature(plan, 'gst')) return res.status(403).json({ message: 'Your plan does not include GST reports. Please upgrade.' });
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const ownerId = req.user.ownerId || req.user._id;

        const [summaryAgg] = await Bill.aggregate([
            {
                $match: {
                    user: ownerId,
                    gstEnabled: true,
                    date: { $gte: start, $lt: end },
                },
            },
            {
                $group: {
                    _id: null,
                    invoiceCount: { $sum: 1 },
                    taxableAmount: { $sum: { $ifNull: ['$taxableAmount', 0] } },
                    gstAmount: { $sum: { $ifNull: ['$gstAmount', 0] } },
                    finalTotal: { $sum: { $ifNull: ['$finalTotal', 0] } },
                },
            },
        ]);

        const summary = summaryAgg || { invoiceCount: 0, taxableAmount: 0, gstAmount: 0, finalTotal: 0 };
        summary.taxableAmount = Math.round(summary.taxableAmount * 100) / 100;
        summary.gstAmount = Math.round(summary.gstAmount * 100) / 100;
        summary.finalTotal = Math.round(summary.finalTotal * 100) / 100;

        res.json(summary);
    } catch (err) {
        res.status(500).json({ message: 'Failed to load GST summary' });
    }
});

module.exports = router;
