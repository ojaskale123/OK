const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');

let masterProducts = [];

router.get('/', protect, async (req, res) => {
    try {
        if (req.user._id === 'master-admin-id' || req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') return res.json(masterProducts);
        // Use .lean() to significantly reduce memory overhead when fetching large sets
        const products = await Product.find({ user: req.user.ownerId }).lean();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const { name, barcode, buyPrice, price, retailerPrice, stockQuantity, thresholdAlert, category, image, mfgDate } = req.body;
        
        if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
            const np = { _id: Date.now().toString(), name, barcode, category, image, buyPrice: Number(buyPrice||0), price: Number(price), retailerPrice: retailerPrice ? Number(retailerPrice) : Number(price), stockQuantity: Number(stockQuantity), thresholdAlert: 10, user: 'master-admin-id', mfgDate: mfgDate || null };
            masterProducts.push(np);
            global.masterLogs = global.masterLogs || [];
            global.masterLogs.push({
                _id: Date.now().toString(), date: new Date().toISOString(),
                user: req.user._id, actionType: 'PRODUCT_ADD', description: `Added Stock: ${name}`,
                metadata: { productId: np._id, name, barcode, stockQuantity: np.stockQuantity }
            });
            return res.status(201).json(np);
        }

        // Inventory Limit Logic based on Subscription
        const plan = req.user.subscription.plan;
        const currentProducts = await Product.countDocuments({ user: req.user.ownerId });
        
        let maxLimit = 10; // Free limit
        if(plan === 'Shopkeeper') maxLimit = 1000;
        if(plan === 'Wholesale') maxLimit = 5000;
        if(plan === 'Retail Pro') maxLimit = 999999;

        if(plan === 'None' && currentProducts >= maxLimit) {
             return res.status(403).json({ message: `Free plan limited to ${maxLimit} products. Please upgrade.`});
        } else if (currentProducts >= maxLimit) {
             return res.status(403).json({ message: `${plan} plan limited to ${maxLimit} products. Please purchase add-ons.`});
        }

        const product = new Product({
            user: req.user.ownerId,
            barcode, name, buyPrice, price, retailerPrice, stockQuantity, thresholdAlert, category, image, mfgDate
        });
        const createdProduct = await product.save();
        
        await ActivityLog.create({
            user: req.user.ownerId.toString(), actionType: 'PRODUCT_ADD', description: `Added Stock: ${name}`,
            metadata: { productId: createdProduct._id, name, barcode, stockQuantity }
        });

        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:id', protect, async (req, res) => {
    try {
        const { name, barcode, buyPrice, price, retailerPrice, stockQuantity, category, image, mfgDate } = req.body;
        
        if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
            const index = masterProducts.findIndex(p => p._id === req.params.id);
            if(index !== -1) {
                masterProducts[index] = { ...masterProducts[index], name: name || masterProducts[index].name, category: category ?? masterProducts[index].category, image: image ?? masterProducts[index].image, barcode: barcode ?? masterProducts[index].barcode, buyPrice: buyPrice ?? masterProducts[index].buyPrice, price: price ?? masterProducts[index].price, retailerPrice: retailerPrice ?? masterProducts[index].retailerPrice, stockQuantity: stockQuantity ?? masterProducts[index].stockQuantity, mfgDate: mfgDate !== undefined ? mfgDate : masterProducts[index].mfgDate };
                global.masterLogs = global.masterLogs || [];
                global.masterLogs.push({
                    _id: Date.now().toString(), date: new Date().toISOString(),
                    user: req.user._id, actionType: 'PRODUCT_EDIT', description: `Edited Item: ${masterProducts[index].name}`,
                    metadata: { productId: masterProducts[index]._id, name: masterProducts[index].name, stockQuantity: masterProducts[index].stockQuantity }
                });
                return res.json(masterProducts[index]);
            }
            return res.status(404).json({message: "Not found"});
        }

        const product = await Product.findById(req.params.id);
        if(!product || product.user.toString() !== req.user.ownerId.toString()) return res.status(401).json({message: "Not allowed"});
        
        if(name) product.name = name;
        if(barcode !== undefined) product.barcode = barcode;
        if(buyPrice !== undefined) product.buyPrice = buyPrice;
        if(price !== undefined) product.price = price;
        if(stockQuantity !== undefined) product.stockQuantity = stockQuantity;
        if(category !== undefined) product.category = category;
        if(image !== undefined) product.image = image;
        if(retailerPrice !== undefined) product.retailerPrice = retailerPrice;
        if(mfgDate !== undefined) product.mfgDate = mfgDate;
        
        await product.save();
        
        await ActivityLog.create({
            user: req.user.ownerId.toString(), actionType: 'PRODUCT_EDIT', description: `Edited Item: ${product.name}`,
            metadata: { productId: product._id, name: product.name, stockQuantity: product.stockQuantity }
        });

        res.json(product);
    } catch(err) { res.status(500).json({message: "Error"}); }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        if (req.user._id === '000000000000000000000000' || req.user._id === '111111111111111111111111') {
            const index = masterProducts.findIndex(p => p._id === req.params.id);
            if(index !== -1) {
                const deletedName = masterProducts[index].name;
                masterProducts.splice(index, 1);
                global.masterLogs = global.masterLogs || [];
                global.masterLogs.push({
                    _id: Date.now().toString(), date: new Date().toISOString(),
                    user: req.user._id, actionType: 'PRODUCT_DELETE', description: `Deleted Item: ${deletedName}`, metadata: {}
                });
                return res.json({ message: "Product removed" });
            }
            return res.status(404).json({message: "Not found"});
        }

        const product = await Product.findById(req.params.id);
        if(!product || product.user.toString() !== req.user.ownerId.toString()) {
            return res.status(401).json({message: "Not allowed"});
        }
        
        const deletedName = product.name;
        await Product.findByIdAndDelete(req.params.id);

        await ActivityLog.create({
            user: req.user.ownerId.toString(), actionType: 'PRODUCT_DELETE', description: `Deleted Item: ${deletedName}`, metadata: {}
        });

        res.json({ message: "Product removed" });
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

module.exports = router;
