const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    gstRate: { type: Number, default: 0 },
    hsn: { type: String, default: '' },
    taxableValue: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    applyGst: { type: Boolean, default: false },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    imei1: { type: String, default: '' },
    imei2: { type: String, default: '' },
    category: { type: String, default: 'Others' }
}, { _id: false });

const billSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceNumber: { type: String },
    gstEnabled: { type: Boolean, default: false },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerGstin: { type: String, default: '' },
    items: [billItemSchema],
    subtotal: { type: Number, required: true },
    taxableAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    discountApplied: { type: Number, default: 0 },
    finalTotal: { type: Number, required: true },
    paymentMode: { type: String, enum: ['Cash', 'Online'], default: 'Cash' },
    placeOfSupply: { type: String, default: '' },
    receiptImage: { type: String, select: false },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

billSchema.index({ user: 1, date: -1 });
billSchema.index({ user: 1, gstEnabled: 1, date: 1 });

module.exports = mongoose.model('Bill', billSchema);
