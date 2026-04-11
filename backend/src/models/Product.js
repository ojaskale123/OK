const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    barcode: { type: String, default: '' },
    name: { type: String, required: true },
    buyPrice: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    stockQuantity: { type: Number, required: true },
    thresholdAlert: { type: Number, default: 5 },
    category: { type: String, default: 'Others' },
    image: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
