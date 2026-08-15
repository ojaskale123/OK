import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Package, Plus, Barcode, TrendingUp, Image as ImageIcon, Trash2, Camera, Search, X } from 'lucide-react';
import ProductImage from '../components/ProductImage';
import { calcBuyGstBreakup, splitLineTax, CGST_RATE, SGST_RATE } from '../utils/gst';

const CATEGORIES = ["Second Hand Mobile", "Batteries", "Accessories", "Folders", "OCA", "Others"];

const Inventory = () => {
    const { token, user } = useAuth();
    const { products, searchProducts, upsertProduct, removeProduct, fetchProductDetail, getProductImage, hydrateProductImage } = useData();
    const [filterCat, setFilterCat] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebouncedValue(searchQuery, 300);
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    
    // Form States
    const [barcode, setBarcode] = useState('');
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Others');
    const [image, setImage] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [price, setPrice] = useState(''); // Customer Price
    const [retailerPrice, setRetailerPrice] = useState(''); // Retailer Price
    const [stock, setStock] = useState('');
    const [mfgDate, setMfgDate] = useState('');
    const [imei1, setImei1] = useState('');
    const [imei2, setImei2] = useState('');
    const [applyGst, setApplyGst] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    
    const [editProductId, setEditProductId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const [error, setError] = useState(null);

    const plan = user?.subscription?.plan || 'None';

    const addFormGstPreview = useMemo(() => {
        const buy = Number(buyPrice) || 0;
        const sell = Number(price) || 0;
        const buyB = calcBuyGstBreakup(buy, applyGst);
        const sellB = applyGst ? splitLineTax(sell, true) : { taxableValue: sell, gstAmount: 0, cgstAmount: 0, sgstAmount: 0 };
        return { buyB, sellB };
    }, [buyPrice, price, applyGst]);

    const processImageFile = (file) => {
        if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400;
                    const scaleSize = MAX_WIDTH / img.width;
                    canvas.width = MAX_WIDTH;
                    canvas.height = img.height * scaleSize;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setImage(compressedDataUrl);
                    setShowImagePicker(false);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
    };

    const handleImageUpload = (e) => {
        processImageFile(e.target.files?.[0]);
        e.target.value = '';
    };

    const openCamera = () => {
        cameraInputRef.current?.click();
    };

    const openGallery = () => {
        galleryInputRef.current?.click();
    };

    const addProduct = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name, barcode, category, image,
                    buyPrice: Number(buyPrice), price: Number(price),
                    retailerPrice: Number(retailerPrice || price),
                    stockQuantity: Number(stock),
                    mfgDate: category === 'Batteries' ? mfgDate : undefined,
                    applyGst,
                    imei1: category === 'Second Hand Mobile' ? imei1 : undefined,
                    imei2: category === 'Second Hand Mobile' ? imei2 : undefined,
                })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            
            upsertProduct(data);
            setName(''); setBarcode(''); setCategory('Others'); setImage(''); setBuyPrice(''); setPrice(''); setRetailerPrice(''); setStock(''); setMfgDate('');
            setImei1(''); setImei2('');
            setApplyGst(false);
            setShowImagePicker(false);
        } catch(err) {
            setError(err.message);
        }
    }

    const startEdit = async (p) => {
        setEditProductId(p._id);
        let image = p.image || '';
        if (p.hasImage && !image) {
            const detail = await fetchProductDetail(p._id);
            if (detail?.image) image = detail.image;
        }
        setEditForm({
            name: p.name, barcode: p.barcode, category: p.category, image,
            buyPrice: p.buyPrice, price: p.price, retailerPrice: p.retailerPrice || p.price,
            stockQuantity: p.stockQuantity,
            mfgDate: p.mfgDate ? new Date(p.mfgDate).toISOString().split('T')[0] : '',
            applyGst: p.applyGst === true || (p.applyGst !== false && Number(p.gstRate) > 0),
            imei1: p.imei1 || '',
            imei2: p.imei2 || '',
        });
    }

    const saveEdit = async (id) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            const normalized = {
                ...data,
                hasImage: data.hasImage ?? Boolean(data.image && data.image.length > 0),
            };
            upsertProduct(normalized);
            setSearchResults((prev) =>
                prev
                    ? prev.map((p) => (p._id === normalized._id ? normalized : p))
                    : prev
            );
            setEditProductId(null);
        } catch(e) { console.error(e); }
    }

    const deleteProduct = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                removeProduct(id);
            }
        } catch(e) { console.error(e); }
    }

    useEffect(() => {
        const q = debouncedSearch.trim();
        if (!q) {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        let cancelled = false;
        (async () => {
            setIsSearching(true);
            try {
                const items = await searchProducts(q, filterCat);
                if (!cancelled) setSearchResults(items);
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, filterCat, searchProducts]);

    const displayProducts = useMemo(() => {
        const base =
            filterCat === 'All' ? products : products.filter((p) => p.category === filterCat);
        const q = debouncedSearch.trim().toLowerCase();
        if (!q) return base;

        if (searchResults !== null) return searchResults;

        return base.filter(
            (p) =>
                p.name?.toLowerCase().includes(q) ||
                String(p.barcode || '').toLowerCase().includes(q)
        );
    }, [products, filterCat, debouncedSearch, searchResults]);

    useEffect(() => {
        displayProducts
            .filter((p) => p.hasImage && !getProductImage(p))
            .forEach((p) => hydrateProductImage(p._id));
    }, [displayProducts, getProductImage, hydrateProductImage]);

    const totalInventoryValue = useMemo(
        () => displayProducts.reduce((acc, p) => acc + (p.buyPrice * p.stockQuantity || 0), 0),
        [displayProducts]
    );
    const expectedProfit = useMemo(
        () =>
            displayProducts.reduce(
                (acc, p) => acc + ((p.price - (p.buyPrice || 0)) * p.stockQuantity),
                0
            ),
        [displayProducts]
    );

    return (
        <div className="animate-fade-in">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                <h2 className="text-gradient">Visual Inventory Hub</h2>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <div className="glass-card" style={{padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                        <Package size={16} className="text-secondary" /> Val: ₹{totalInventoryValue.toLocaleString()}
                    </div>
                    <div className="glass-card" style={{padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                        <TrendingUp size={16} className="amount-receive" /> Exp. Profit: ₹{expectedProfit.toLocaleString()}
                    </div>
                </div>
            </div>
            
            {error && <div className="glass-card" style={{borderColor: 'var(--ok-red)', marginBottom: '1rem'}}>
                <p className="amount-give">{error}</p>    
            </div>}

            <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
                {/* Add Product Sidebar */}
                <div className="glass-card form-container" style={{ flex: '1 1 320px', maxWidth: '100%', height: 'max-content' }}>
                    <h3 style={{marginBottom: '1rem'}}>Stock Entry</h3>
                    <form onSubmit={addProduct}>
                        
                        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageUpload} />
                            <input ref={galleryInputRef} id="imageUpload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setShowImagePicker(true)}
                                onKeyDown={(e) => e.key === 'Enter' && setShowImagePicker(true)}
                                style={{
                                    padding: '1rem',
                                    border: '1px dashed rgba(255,255,255,0.25)',
                                    borderRadius: '8px',
                                    background: 'rgba(0,0,0,0.2)',
                                    marginBottom: '0.5rem',
                                    cursor: 'pointer',
                                }}
                            >
                                {image ? (
                                    <>
                                        <img src={image} alt="Product" style={{ maxHeight: '120px', margin: '0 auto 8px', borderRadius: '6px', display: 'block' }} />
                                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Tap to change image</div>
                                    </>
                                ) : (
                                    <div className="text-secondary">
                                        <ImageIcon size={28} style={{ margin: '0 auto 10px' }} />
                                        <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Upload Image</div>
                                        <div style={{ fontSize: '0.8rem' }}>Tap here — then choose Camera or Gallery</div>
                                    </div>
                                )}
                            </div>

                            {showImagePicker && (
                                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                    <p className="text-secondary" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Choose source</p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ flex: 1, padding: '0.65rem', fontSize: '0.9rem' }}
                                            onClick={openCamera}
                                        >
                                            <Camera size={18} /> Camera
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ flex: 1, padding: '0.65rem', fontSize: '0.9rem' }}
                                            onClick={openGallery}
                                        >
                                            <ImageIcon size={18} /> Gallery
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn"
                                        style={{ width: '100%', marginTop: '0.5rem', padding: '0.35rem', fontSize: '0.75rem', background: 'transparent', color: 'var(--text-secondary)' }}
                                        onClick={() => setShowImagePicker(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{position: 'relative'}}>
                            <input id="barcode" name="barcode" aria-label="Barcode ID" placeholder="Barcode ID (Optional)" className="form-input" value={barcode} onChange={e=>setBarcode(e.target.value)} style={{paddingLeft: '35px'}} />
                            <Barcode size={18} className="text-secondary" style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)'}} />
                        </div>
                        
                        <div className="form-group">
                            <input id="productName" name="productName" aria-label="Product Name" placeholder="Product Name" className="form-input" value={name} onChange={e=>setName(e.target.value)} required />
                        </div>
                        
                        <div className="form-group">
                            <select id="productCategory" name="productCategory" aria-label="Product Category" className="form-input" value={category} onChange={e=>setCategory(e.target.value)}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {category === 'Batteries' && (
                            <div className="form-group" style={{animation: 'fadeIn 0.2s ease'}}>
                                <label htmlFor="mfgDate" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Manufacturing Date</label>
                                <input id="mfgDate" name="mfgDate" type="date" className="form-input" value={mfgDate} onChange={e=>setMfgDate(e.target.value)} required />
                            </div>
                        )}

                        {category === 'Second Hand Mobile' && (
                            <div style={{animation: 'fadeIn 0.2s ease', display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
                                <div className="form-group" style={{flex: 1, marginBottom: 0}}>
                                    <label htmlFor="imei1" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>IMEI No. 1</label>
                                    <input id="imei1" name="imei1" placeholder="IMEI 1" type="text" className="form-input" value={imei1} onChange={e=>setImei1(e.target.value)} />
                                </div>
                                <div className="form-group" style={{flex: 1, marginBottom: 0}}>
                                    <label htmlFor="imei2" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>IMEI No. 2</label>
                                    <input id="imei2" name="imei2" placeholder="IMEI 2" type="text" className="form-input" value={imei2} onChange={e=>setImei2(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(212, 184, 122, 0.1)', borderRadius: '8px' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Apply GST on this item</div>
                                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>CGST {CGST_RATE}% + SGST {SGST_RATE}%</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={applyGst}
                                onChange={(e) => setApplyGst(e.target.checked)}
                                style={{ transform: 'scale(1.35)', cursor: 'pointer' }}
                            />
                        </div>

                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <div className="form-group" style={{flex: 1}}>
                                <label htmlFor="buyPrice" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Buy price (₹)</label>
                                <input id="buyPrice" name="buyPrice" placeholder="Cost" type="number" className="form-input" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{flex: 1}}>
                                <label htmlFor="price" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Sell price (₹)</label>
                                <input id="price" name="price" placeholder="Retail" type="number" className="form-input" value={price} onChange={e=>setPrice(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{flex: 1}}>
                                <label htmlFor="retailerPrice" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Wholesale (₹)</label>
                                <input id="retailerPrice" name="retailerPrice" placeholder="Dealer" type="number" className="form-input" value={retailerPrice} onChange={e=>setRetailerPrice(e.target.value)} required />
                            </div>
                        </div>

                        {applyGst && buyPrice && price && (
                            <div className="glass-card" style={{ padding: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', background: 'rgba(212, 184, 122, 0.08)' }}>
                                <div className="text-secondary">GST preview (CGST {CGST_RATE}% + SGST {SGST_RATE}%)</div>
                                <div style={{ marginTop: '0.35rem' }}>Buy + GST: ₹{addFormGstPreview.buyB.landedCost}</div>
                                <div>Sell split: Taxable ₹{addFormGstPreview.sellB.taxableValue} + GST ₹{addFormGstPreview.sellB.gstAmount}</div>
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label htmlFor="stock" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Stock Quantity</label>
                            <input id="stock" name="stock" placeholder="Quantity" type="number" className="form-input" value={stock} onChange={e=>setStock(e.target.value)} required />
                        </div>
                        
                        <button className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem'}}><Plus size={18} /> Catalog Item</button>
                    </form>
                                        <div style={{marginTop: '1.5rem', fontSize: '0.85rem', textAlign: 'center'}} className="text-secondary">
                                                Plan: <span className="text-gradient" style={{fontWeight: 'bold'}}>{plan}</span> —
                                                <span style={{marginLeft: '0.35rem'}}>
                                                    {plan === 'standard' ? 'Up to 500 items' : plan === 'pro' || plan === 'enterprise' ? 'Unlimited items' : 'Inventory & basic selling only'}
                                                </span>
                                        </div>
                </div>

                {/* Product List / Cards */}
                <div style={{ flex: '2 1 300px', width: '100%' }}>
                    <div
                        className="glass-card"
                        style={{
                            marginBottom: '1rem',
                            padding: '0.65rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}
                    >
                        <Search size={20} className="text-secondary" style={{ flexShrink: 0 }} />
                        <input
                            type="search"
                            className="form-input"
                            style={{ flex: 1, margin: 0 }}
                            placeholder="Search by product name or barcode…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search inventory by name or barcode"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.55rem', flexShrink: 0 }}
                                onClick={() => setSearchQuery('')}
                                aria-label="Clear search"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                    {debouncedSearch.trim() && (
                        <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '-0.5rem 0 1rem' }}>
                            {isSearching
                                ? 'Searching…'
                                : `${displayProducts.length} result${displayProducts.length === 1 ? '' : 's'} for “${debouncedSearch.trim()}”`}
                        </p>
                    )}

                    {/* Category Filter Pipeline */}
                    <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                        <button className={`btn ${filterCat === 'All' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem'}} onClick={() => setFilterCat('All')}>All</button>
                        {CATEGORIES.map(c => (
                            <button key={c} className={`btn ${filterCat === c ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem'}} onClick={() => setFilterCat(c)}>{c}</button>
                        ))}
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem'}}>
                        {displayProducts.map(p => {
                            const margin = p.price - (p.buyPrice || 0);
                            const marginPercent = p.buyPrice ? ((margin / p.buyPrice) * 100).toFixed(0) : 100;
                            
                            if (editProductId === p._id) {
                                return (
                                    <div key={p._id} className="glass-card" style={{padding: '1rem', background: 'rgba(212, 184, 122, 0.1)'}}>
                                        <div style={{marginBottom: '0.5rem'}}>
                                            <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Product Name</label>
                                            <input className="form-input" style={{fontSize: '0.9rem', padding: '0.4rem'}} value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} />
                                        </div>
                                        <div style={{marginBottom: '0.5rem'}}>
                                            <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Category</label>
                                            <select className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.category} onChange={e=>setEditForm({...editForm, category: e.target.value})}>
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        {editForm.category === 'Batteries' && (
                                            <div style={{marginBottom: '0.5rem'}}>
                                                <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Mfg Date</label>
                                                <input type="date" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.mfgDate} onChange={e=>setEditForm({...editForm, mfgDate: e.target.value})} />
                                            </div>
                                        )}

                                        {editForm.category === 'Second Hand Mobile' && (
                                            <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                                <div style={{flex: 1}}>
                                                    <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>IMEI No. 1</label>
                                                    <input className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.imei1 || ''} onChange={e=>setEditForm({...editForm, imei1: e.target.value})} />
                                                </div>
                                                <div style={{flex: 1}}>
                                                    <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>IMEI No. 2</label>
                                                    <input className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.imei2 || ''} onChange={e=>setEditForm({...editForm, imei2: e.target.value})} />
                                                </div>
                                            </div>
                                        )}
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                                            <input type="checkbox" checked={Boolean(editForm.applyGst)} onChange={(e) => setEditForm({ ...editForm, applyGst: e.target.checked })} />
                                            Apply GST (CGST {CGST_RATE}% + SGST {SGST_RATE}%)
                                        </label>
                                        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                            <div style={{flex: 1}}>
                                                <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Buy (₹)</label>
                                                <input type="number" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.buyPrice} onChange={e=>setEditForm({...editForm, buyPrice: e.target.value})} />
                                            </div>
                                            <div style={{flex: 1}}>
                                                <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Cust. (₹)</label>
                                                <input type="number" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.price} onChange={e=>setEditForm({...editForm, price: e.target.value})} />
                                            </div>
                                            <div style={{flex: 1}}>
                                                <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Retailer (₹)</label>
                                                <input type="number" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.retailerPrice} onChange={e=>setEditForm({...editForm, retailerPrice: e.target.value})} />
                                            </div>
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.5rem'}}>
                                            <div>
                                                <label style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>Stock Qty</label>
                                                <input type="number" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem', width: '80px'}} value={editForm.stockQuantity} onChange={e=>setEditForm({...editForm, stockQuantity: e.target.value})} />
                                            </div>
                                            <button className="btn btn-primary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem', height: 'max-content'}} onClick={() => saveEdit(p._id)}>Save</button>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div key={p._id} className="glass-card" style={{padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                                    <ProductImage src={getProductImage(p)} alt={p.name} height={140} />
                                    
                                    <div style={{padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                                            <div>
                                                <div style={{fontWeight: 600, color: '#fff', fontSize: '1rem', lineHeight: 1.2}}>{p.name}</div>
                                                <div className="text-secondary" style={{fontSize: '0.75rem', marginTop: '4px'}}>
                                                    {p.category}
                                                    {(p.applyGst || Number(p.gstRate) > 0) && (
                                                        <span style={{ color: 'var(--neon-purple)', marginLeft: '6px' }}>· GST</span>
                                                    )}
                                                </div>
                                                {p.category === 'Second Hand Mobile' && (p.imei1 || p.imei2) && (
                                                    <div className="text-secondary" style={{fontSize: '0.75rem', marginTop: '4px', fontFamily: 'monospace'}}>
                                                        {p.imei1 && `IMEI 1: ${p.imei1}`}
                                                        {p.imei1 && p.imei2 && ' | '}
                                                        {p.imei2 && `IMEI 2: ${p.imei2}`}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px'}}>
                                                <div className="amount-receive" style={{fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(127, 168, 146, 0.12)', borderRadius: '12px', fontWeight: 'bold'}}>+{marginPercent}%</div>
                                                {p.category === 'Batteries' && p.mfgDate && (() => {
                                                    const mfg = new Date(p.mfgDate);
                                                    const expiry = new Date(mfg.setFullYear(mfg.getFullYear() + 1));
                                                    const isExpired = new Date() > expiry;
                                                    return isExpired ? (
                                                        <div style={{fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255, 60, 60, 0.2)', color: 'var(--ok-red)', borderRadius: '12px', fontWeight: 'bold', animation: 'pulse 2s infinite'}}>EXPIRED!</div>
                                                    ) : (
                                                        <div style={{fontSize: '0.65rem', color: 'var(--text-secondary)'}}>Exp: {expiry.toLocaleDateString(undefined, {month:'short', year:'numeric'})}</div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        
                                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem'}}>
                                            <div>
                                                <div className="text-secondary" style={{fontSize: '0.75rem'}}>Cust / Wholesale</div>
                                                <div style={{fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                    <span className="text-gradient">₹{p.price}</span>
                                                    <span className="text-secondary" style={{fontSize: '0.85em'}}>| ₹{p.retailerPrice || p.price}</span> 
                                                </div>
                                            </div>
                                            <div style={{textAlign: 'right'}}>
                                                <div className="text-secondary" style={{fontSize: '0.75rem'}}>Stock</div>
                                                <div style={{color: p.stockQuantity < p.thresholdAlert ? 'var(--ok-red)' : '#fff', fontWeight: 'bold'}}>
                                                    {p.stockQuantity}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            {p.barcode ? <div style={{fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)'}}>{p.barcode}</div> : <div/>}
                                            <div style={{display: 'flex', gap: '0.5rem'}}>
                                                <button className="btn" style={{padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)'}} onClick={() => startEdit(p)}>Edit</button>
                                                <button className="btn" style={{display: 'flex', alignItems: 'center', padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255, 60, 60, 0.2)', color: 'var(--ok-red)'}} onClick={() => deleteProduct(p._id)}>
                                                    <Trash2 size={12} style={{marginRight: '4px'}}/> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {displayProducts.length === 0 && !isSearching && (
                            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                {debouncedSearch.trim()
                                    ? 'No items match that name or barcode.'
                                    : 'No products found in this category.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Inventory;
