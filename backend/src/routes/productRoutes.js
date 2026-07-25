const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/authMiddleware');
const { parsePagination } = require('../utils/pagination');

const MAX_CATALOG = 5000;
/** Inline base64 above this size is fetched per-product; URLs are always included. */
const MAX_INLINE_BASE64 = 150000;

function mapProductList(doc) {
    const raw = doc.image || '';
    const hasImage = raw.length > 0;
    if (!hasImage) {
        return { ...doc, image: '', hasImage: false };
    }
    if (/^https?:\/\//i.test(raw)) {
        return { ...doc, hasImage: true };
    }
    if (raw.startsWith('data:image') && raw.length <= MAX_INLINE_BASE64) {
        return { ...doc, hasImage: true };
    }
    const { image, ...rest } = doc;
    return { ...rest, image: '', hasImage: true };
}

router.get('/', protect, async (req, res) => {
    try {
        const ownerId = req.user.ownerId;
        const filter = { user: ownerId };

        if (req.query.search) {
            const q = req.query.search.trim();
            if (q) {
                filter.$or = [
                    { name: { $regex: q, $options: 'i' } },
                    { barcode: { $regex: q, $options: 'i' } },
                ];
            }
        }

        if (req.query.category && req.query.category !== 'All') {
            filter.category = req.query.category;
        }

        const isSearch = Boolean(req.query.search?.trim());
        const { page, limit, skip } = parsePagination(req.query, {
            defaultLimit: isSearch ? 80 : MAX_CATALOG,
            maxLimit: isSearch ? 200 : MAX_CATALOG,
        });

        const [products, total] = await Promise.all([
            Product.find(filter)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(filter),
        ]);

        res.json({
            items: products.map(mapProductList),
            total,
            page,
            limit,
            hasMore: skip + products.length < total,
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/:id', protect, async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            user: req.user.ownerId,
        }).lean();

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(mapProductList(product));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        let { name, barcode, buyPrice, price, retailerPrice, stockQuantity, thresholdAlert, category, image, mfgDate, applyGst, gstRate, hsn, imei1, imei2 } = req.body;

        if (image && image.startsWith('data:image')) {
            const { uploadBase64ToDrive } = require('../utils/googleDrive');
            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            if (folderId) {
                try {
                    image = await uploadBase64ToDrive(image, folderId, `product_${Date.now()}.jpg`);
                } catch (err) {
                    console.error("Drive upload failed", err);
                }
            }
        }

           const plan = req.user.subscription?.plan || 'basic';
           const { getMaxProducts } = require('../utils/planUtils');
           const currentProducts = await Product.countDocuments({ user: req.user.ownerId });
           const maxLimit = getMaxProducts(plan);

           if (currentProducts >= maxLimit) {
              return res.status(403).json({ message: `Your plan (${plan}) allows up to ${maxLimit} products. Please upgrade.` });
           }

        let existingProduct = null;
        if (barcode && barcode.trim() !== '') {
            existingProduct = await Product.findOne({ user: req.user.ownerId, barcode: barcode.trim() });
        }
        if (!existingProduct && name) {
            existingProduct = await Product.findOne({ user: req.user.ownerId, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
        }

        if (existingProduct) {
            existingProduct.stockQuantity += Number(stockQuantity || 0);
            if (buyPrice !== undefined) existingProduct.buyPrice = buyPrice;
            if (price !== undefined) existingProduct.price = price;
            if (retailerPrice !== undefined) existingProduct.retailerPrice = retailerPrice;
            if (category !== undefined) existingProduct.category = category;
            if (image) existingProduct.image = image;
            if (mfgDate !== undefined) existingProduct.mfgDate = mfgDate;
            if (thresholdAlert !== undefined) existingProduct.thresholdAlert = thresholdAlert;
            if (applyGst !== undefined) {
                existingProduct.applyGst = Boolean(applyGst);
                existingProduct.gstRate = applyGst ? 18 : 0;
            } else if (gstRate !== undefined) {
                existingProduct.gstRate = gstRate;
                existingProduct.applyGst = Number(gstRate) > 0;
            }
            if (hsn !== undefined) existingProduct.hsn = hsn;
            if (imei1 !== undefined) existingProduct.imei1 = imei1;
            if (imei2 !== undefined) existingProduct.imei2 = imei2;

            const updatedProduct = await existingProduct.save();

            await ActivityLog.create({
                user: req.user.ownerId.toString(), 
                actionType: 'PRODUCT_EDIT', 
                description: `Restocked Item: ${existingProduct.name} (Added ${stockQuantity})`,
                performedBy: req.user.name || 'Owner',
                performedById: req.user._id.toString(),
                metadata: { productId: updatedProduct._id, name: existingProduct.name, stockQuantity: updatedProduct.stockQuantity }
            });

            return res.status(200).json(mapProductList(updatedProduct.toObject()));
        }

        const product = new Product({
            user: req.user.ownerId,
            barcode, name, buyPrice, price, retailerPrice, stockQuantity, thresholdAlert, category, image, mfgDate,
            applyGst: Boolean(applyGst),
            gstRate: applyGst ? 18 : 0,
            hsn: hsn || '8517',
            imei1: imei1 || '',
            imei2: imei2 || '',
        });
        const createdProduct = await product.save();
        
        await ActivityLog.create({
            user: req.user.ownerId.toString(), actionType: 'PRODUCT_ADD', description: `Added Stock: ${name}`,
            performedBy: req.user.name || 'Owner',
            performedById: req.user._id.toString(),
            metadata: { productId: createdProduct._id, name, barcode, stockQuantity }
        });

        res.status(201).json(mapProductList(createdProduct.toObject()));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:id', protect, async (req, res) => {
    try {
        let { name, barcode, buyPrice, price, retailerPrice, stockQuantity, category, image, mfgDate, applyGst, gstRate, hsn, imei1, imei2 } = req.body;
        
        if (image && image.startsWith('data:image')) {
            const { uploadBase64ToDrive } = require('../utils/googleDrive');
            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            if (folderId) {
                try {
                    image = await uploadBase64ToDrive(image, folderId, `product_edit_${Date.now()}.jpg`);
                } catch (err) {
                    console.error("Drive upload failed", err);
                }
            }
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
        if (applyGst !== undefined) {
            product.applyGst = Boolean(applyGst);
            product.gstRate = applyGst ? 18 : 0;
        } else if (gstRate !== undefined) {
            product.gstRate = gstRate;
            product.applyGst = Number(gstRate) > 0;
        }
        if(hsn !== undefined) product.hsn = hsn;
        if(imei1 !== undefined) product.imei1 = imei1;
        if(imei2 !== undefined) product.imei2 = imei2;
        
        await product.save();
        
        await ActivityLog.create({
            user: req.user.ownerId.toString(), actionType: 'PRODUCT_EDIT', description: `Edited Item: ${product.name}`,
            performedBy: req.user.name || 'Owner',
            performedById: req.user._id.toString(),
            metadata: { productId: product._id, name: product.name, stockQuantity: product.stockQuantity }
        });

        res.json(mapProductList(product.toObject()));
    } catch(err) { res.status(500).json({message: "Error"}); }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if(!product || product.user.toString() !== req.user.ownerId.toString()) {
            return res.status(401).json({message: "Not allowed"});
        }
        
        const deletedName = product.name;
        await Product.findByIdAndDelete(req.params.id);

        await ActivityLog.create({
            user: req.user.ownerId.toString(), actionType: 'PRODUCT_DELETE', description: `Deleted Item: ${deletedName}`,
            performedBy: req.user.name || 'Owner',
            performedById: req.user._id.toString(),
            metadata: {}
        });

        res.json({ message: "Product removed" });
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

module.exports = router;
