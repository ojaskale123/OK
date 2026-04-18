const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    barcode: { type: String, default: '' },
    name: { type: String, required: true },
    buyPrice: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    retailerPrice: { type: Number, required: false },
    stockQuantity: { type: Number, required: true },
    thresholdAlert: { type: Number, default: 5 },
    category: { type: String, default: 'Others' },
    image: { type: String, default: '' },
    mfgDate: { type: Date, required: false }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
