import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ShoppingCart, Receipt, Search } from 'lucide-react';
import html2canvas from 'html2canvas';
import { aggregateCartTax, productHasGst, CGST_RATE, SGST_RATE } from '../utils/gst';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import ProductImage from '../components/ProductImage';
import { normalizeIndianPhone, sendReceiptViaWhatsApp, buildWhatsAppAppLink, openWhatsApp, isMobileDevice } from '../utils/whatsapp';
import { getApiBase } from '../utils/api';

async function blobToBase64(blob) {
    if (!blob) return null;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                resolve(null);
                return;
            }
            const comma = result.indexOf(',');
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

const PosBilling = () => {
    const { token, user } = useAuth();
    const { products, isLoadingProducts, searchProducts, productTotal, patchProductStock, getProductImage, hydrateProductImage } = useData();
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [billingMode, setBillingMode] = useState('Customer'); // 'Customer' or 'Retailer'
    const [paymentMode, setPaymentMode] = useState('Cash'); // 'Cash' or 'Online'
    const [lastSale, setLastSale] = useState(null);
    const [whatsappLink, setWhatsappLink] = useState('');
    const [whatsappAppLink, setWhatsappAppLink] = useState('');
    const [pendingShare, setPendingShare] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [shopName, setShopName] = useState(user?.shopName || 'Frndz Telecom');
    const [gstSettings, setGstSettings] = useState(user?.gstSettings || { enabled: false });

    const hasGstInCart = useMemo(() => cart.some((c) => c.applyGst), [cart]);

    React.useEffect(() => {
        const fetchShopDetails = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/auth/shop-details`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.shopName) setShopName(data.shopName);
                    if (data.gstSettings) setGstSettings(data.gstSettings);
                }
            } catch (e) {
                console.error("Failed to load shop details", e);
            }
        };
        if (token) fetchShopDetails();
    }, [token]);

    React.useEffect(() => {
        if (user?.gstSettings) setGstSettings(user.gstSettings);
    }, [user?.gstSettings]);

    const addToCart = (product) => {
        if (product.stockQuantity <= 0) {
            alert("Item is out of stock!");
            return;
        }

        if (product.category === 'Batteries' && product.mfgDate) {
            const mfg = new Date(product.mfgDate);
            const expiry = new Date(mfg.setFullYear(mfg.getFullYear() + 1));
            const isExpired = new Date() > expiry;
            if (isExpired) {
                if (!window.confirm(`⚠️ WARNING: This battery (${product.name}) is EXPIRED! Are you absolutely sure you want to sell it?`)) {
                    return;
                }
            }
        }
        
        // Determine the price based on the current billing mode
        const activePrice = billingMode === 'Retailer' ? (product.retailerPrice || product.price) : product.price;
        
        const existing = cart.find(c => c.product === product._id);
        if(existing) {
            if (existing.quantity + 1 > product.stockQuantity) {
                alert("Cannot add more than available stock!");
                return;
            }
            setCart(cart.map(c => c.product === product._id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * existing.price } : c));
        } else {
            setCart([...cart, {
                product: product._id,
                name: product.name,
                price: activePrice,
                quantity: 1,
                total: activePrice,
                stockQuantity: product.stockQuantity,
                applyGst: productHasGst(product),
                hsn: product.hsn || '8517',
                category: product.category,
                imei1: product.imei1 || '',
                imei2: product.imei2 || '',
            }]);
        }
    }

    const updateCartQuantity = (productId, delta) => {
        setCart(cart.map(c => {
            if(c.product === productId) {
                const newQuantity = c.quantity + delta;
                if (newQuantity > c.stockQuantity) {
                    alert("Cannot add more than available stock!");
                    return c;
                }
                return { ...c, quantity: newQuantity, total: newQuantity * c.price };
            }
            return c;
        }).filter(c => c.quantity > 0));
    }

    const debouncedSearch = useDebouncedValue(searchQuery, 250);
    const [searchResults, setSearchResults] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            if (productTotal > 400 && debouncedSearch.trim()) {
                const results = await searchProducts(debouncedSearch, categoryFilter);
                if (!cancelled) setSearchResults(results);
            } else {
                setSearchResults(null);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [debouncedSearch, categoryFilter, productTotal, searchProducts]);

    const filteredProducts = useMemo(() => {
        const base = searchResults ?? products;
        const q = debouncedSearch.trim().toLowerCase();
        return base.filter((p) => {
            const matchesSearch = !q
                || p.name.toLowerCase().includes(q)
                || (p.barcode && p.barcode.toLowerCase().includes(q));
            const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchResults, debouncedSearch, categoryFilter]);

    useEffect(() => {
        filteredProducts
            .filter((p) => p.hasImage && !getProductImage(p))
            .forEach((p) => hydrateProductImage(p._id));
    }, [filteredProducts, getProductImage, hydrateProductImage]);

    const subtotal = cart.reduce((acc, curr) => acc + curr.total, 0);
    const taxSummary = useMemo(() => {
        if (cart.length === 0) {
            return { taxableAmount: subtotal, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, finalTotal: subtotal, hasGst: false };
        }
        return aggregateCartTax(cart);
    }, [cart, subtotal]);
    const finalTotal = taxSummary.finalTotal;

    const checkout = async () => {
        if(cart.length === 0 || !customerName) return alert("Add items and customer name");

        const phoneForWhatsApp = normalizeIndianPhone(customerPhone);
        if (!phoneForWhatsApp) {
            return alert('Enter customer phone (10 digits) — WhatsApp opens directly to that customer.');
        }

        setIsGenerating(true);
        setWhatsappLink('');
        setWhatsappAppLink('');
        setPendingShare(null);

        const mobile = isMobileDevice();
        const whatsappWindow = !mobile ? window.open('about:blank', '_blank') : null;
        const apiBase = getApiBase();

        let receiptBlob = null;
        const receiptFilename = `Receipt_${(customerName || 'Customer').replace(/\s+/g, '_')}_${Date.now()}.png`;
        const cartSnapshot = [...cart];
        const saleTotal = finalTotal;

        try {
            const receiptEl = document.getElementById('receipt-capture');
            if (receiptEl) {
                receiptEl.style.display = 'block';
                const canvas = await html2canvas(receiptEl, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
                receiptEl.style.display = 'none';
                receiptBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            }
        } catch (err) {
            console.error('Image generation failed:', err);
        }

        const receiptImageBase64 = receiptBlob ? await blobToBase64(receiptBlob) : null;

        try {
            const res = await fetch(`${apiBase}/api/pos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    customerName,
                    customerPhone,
                    items: cart,
                    subtotal,
                    discountApplied: 0,
                    finalTotal,
                    paymentMode,
                    receiptImage: receiptImageBase64,
                })
            });

            if(res.ok) {
                const bill = await res.json();
                cartSnapshot.forEach((c) => {
                    if (c.product) patchProductStock(c.product, -c.quantity);
                });
                setLastSale({ customerName, customerPhone, cart: cartSnapshot, finalTotal: saleTotal, paymentMode });

                const receiptImageUrl = bill?._id ? `${apiBase}/api/pos/public/${bill._id}/image` : '';
                const receiptPageUrl = bill?._id ? `${window.location.origin}/receipt/${bill._id}` : '';

                const gstBlock = hasGstInCart
                    ? `*Taxable (GST items):* ₹${taxSummary.taxableAmount.toFixed(2)}
*CGST ${CGST_RATE}%:* ₹${taxSummary.cgstAmount.toFixed(2)}
*SGST ${SGST_RATE}%:* ₹${taxSummary.sgstAmount.toFixed(2)}
`
                    : '';
                const text = `*${shopName.toUpperCase()} ${hasGstInCart ? 'TAX INVOICE' : 'RECEIPT'}*
${hasGstInCart && gstSettings.gstin ? `*GSTIN:* ${gstSettings.gstin}\n` : ''}----------------------------------
*Date:* ${new Date().toLocaleDateString()}
*Customer:* ${customerName}
*Phone:* ${customerPhone}
*Payment:* ${paymentMode}
----------------------------------
*Items:*
${cartSnapshot.map(c => {
    let nameText = `- ${c.name} (Qty: ${c.quantity}) [Section: ${c.category || 'Others'}]`;
    if (c.category === 'Second Hand Mobile' && (c.imei1 || c.imei2)) {
        const imeiDetails = [];
        if (c.imei1) imeiDetails.push(`IMEI 1: ${c.imei1}`);
        if (c.imei2) imeiDetails.push(`IMEI 2: ${c.imei2}`);
        nameText += `\n  _${imeiDetails.join(' | ')}_`;
    }
    return `${nameText} - ₹${c.total}${c.applyGst ? ' [GST: CGST+SGST]' : ' [No GST]'}`;
}).join('\n')}
----------------------------------
${gstBlock}*Total Amount:* ₹${saleTotal.toFixed(2)}
----------------------------------
${receiptImageUrl ? `🧾 *Receipt image:* ${receiptImageUrl}\n` : ''}${receiptPageUrl ? `📄 *View online:* ${receiptPageUrl}\n` : ''}Thank you for your purchase!`;

                const result = await sendReceiptViaWhatsApp({
                    phone: phoneForWhatsApp,
                    text,
                    blob: receiptBlob,
                    filename: receiptFilename,
                    preOpenedWindow: whatsappWindow,
                });

                if (result.url) {
                    setWhatsappLink(result.url);
                    setWhatsappAppLink(buildWhatsAppAppLink(phoneForWhatsApp, text) || result.url);
                }

                setPendingShare({
                    text,
                    filename: receiptFilename,
                    blob: receiptBlob,
                    phone: phoneForWhatsApp,
                });

                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                setPaymentMode('Cash');

                setSuccessMsg(
                    mobile
                        ? 'Bill saved! WhatsApp opened for this customer — tap Send (receipt link shows as image preview).'
                        : 'Bill saved! WhatsApp opened for this customer with full receipt message.'
                );
                setTimeout(() => setSuccessMsg(''), 8000);
            } else {
                if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Failed to save bill. WhatsApp was not opened.');
            }
        } catch(e) {
            if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
            console.error(e);
            alert('Failed to save bill. Check your connection and try again.');
        }

        setIsGenerating(false);
    }

    const handleOpenWhatsAppAgain = () => {
        if (!pendingShare?.phone || !pendingShare?.text) return;
        openWhatsApp(pendingShare.phone, pendingShare.text, null);
    };

    return (
        <div className="animate-fade-in pos-layout">
            <div style={{flex: 2}}>
                <h2 className="text-gradient" style={{marginBottom: '1rem'}}>Point of Sale (POS)</h2>
                {successMsg && (
                    <div className="glass-card" style={{borderColor: 'var(--ok-green)', marginBottom: '1rem'}}>
                        <p className="amount-receive">{successMsg}</p>
                        {pendingShare?.phone && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                style={{ display: 'inline-flex', marginTop: '0.75rem', marginRight: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                onClick={handleOpenWhatsAppAgain}
                            >
                                Open this customer on WhatsApp
                            </button>
                        )}
                        {whatsappLink && (
                            <a
                                href={whatsappAppLink || whatsappLink}
                                target={isMobileDevice() ? '_self' : '_blank'}
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ display: 'inline-flex', marginTop: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                                Open WhatsApp again
                            </a>
                        )}
                    </div>
                )}
                
                {/* Billing Mode Toggle */}
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center'}}>
                    <span className="text-secondary" style={{fontSize: '0.9rem'}}>Sale Type:</span>
                    <button className={`btn ${billingMode === 'Customer' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '20px'}} onClick={() => setBillingMode('Customer')}>Customer</button>
                    <button className={`btn ${billingMode === 'Retailer' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '20px'}} onClick={() => setBillingMode('Retailer')}>Retailer</button>
                </div>

                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
                    {['All', 'Second Hand Mobile', 'Batteries', 'Accessories', 'Folders', 'OCA', 'Others'].map(cat => (
                        <button key={cat} className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}} onClick={() => setCategoryFilter(cat)}>{cat}</button>
                    ))}
                </div>

                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <input 
                        id="productSearch"
                        name="productSearch"
                        aria-label="Search products"
                        type="text" 
                        className="form-input" 
                        placeholder="Scan barcode or type name..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        style={{ paddingLeft: '40px' }} 
                        autoFocus
                    />
                    <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                
                <div className="pos-grid" style={{maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '10px'}}>
                    {filteredProducts.map(p => (
                        <div key={p._id} className="glass-card" style={{cursor: 'pointer', padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column'}} onClick={() => addToCart(p)}>
                            <ProductImage src={getProductImage(p)} alt={p.name} height={120} />
                            <div style={{padding: '1rem', textAlign: 'center'}}>
                                <div style={{fontWeight: 600, marginBottom: '0.25rem', color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.name}</div>
                                {p.barcode && <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontFamily: 'monospace'}}>{p.barcode}</div>}
                                <div className="text-gradient" style={{fontWeight: 'bold'}}>₹{billingMode === 'Retailer' ? (p.retailerPrice || p.price) : p.price}</div>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && <p className="text-secondary">No products match your search.</p>}
                </div>
            </div>

            <div className="glass-card" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem'}}><ShoppingCart /> Current Bill</h3>
                
                <div className="form-group"><input id="customerName" name="customerName" aria-label="Customer Name" placeholder="Customer Name" className="form-input" value={customerName} onChange={e=>setCustomerName(e.target.value)} /></div>
                <div className="form-group"><input id="customerPhone" name="customerPhone" aria-label="Customer Phone" placeholder="Phone (10 digits — opens WhatsApp to this customer)" className="form-input" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} inputMode="numeric" required /></div>

                <div style={{flex: 1, borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '1rem 0', padding: '1rem 0', overflowY: 'auto'}}>
                    {cart.map(c => (
                        <div key={c.product} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem'}}>
                                <div style={{flex: 1}}>
                                    <div style={{fontWeight: 'bold', color: '#fff'}}>{c.name}</div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neon-blue)', margin: '2px 0' }}>Section: {c.category || 'Others'}</span>
                                    {c.applyGst ? (
                                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--neon-purple)' }}>GST · CGST {CGST_RATE}% + SGST {SGST_RATE}%</span>
                                    ) : (
                                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>No GST</span>
                                    )}
                                </div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px 8px'}}>
                                    <button className="btn" style={{padding: '0px 6px', background: 'transparent', border: 'none', color: '#fff'}} onClick={() => updateCartQuantity(c.product, -1)}>-</button>
                                    <span className="text-secondary" style={{fontSize: '0.85rem', width: '20px', textAlign: 'center'}}>{c.quantity}</span>
                                    <button className="btn" style={{padding: '0px 6px', background: 'transparent', border: 'none', color: '#fff'}} onClick={() => updateCartQuantity(c.product, 1)}>+</button>
                                </div>
                                <div style={{width: '70px', textAlign: 'right', fontWeight: 'bold'}}>₹{c.total}</div>
                            </div>
                            {c.category === 'Second Hand Mobile' && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <input 
                                            placeholder="IMEI 1" 
                                            className="form-input" 
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', margin: 0 }} 
                                            value={c.imei1 || ''} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCart(cart.map(item => item.product === c.product ? { ...item, imei1: val } : item));
                                            }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <input 
                                            placeholder="IMEI 2" 
                                            className="form-input" 
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', margin: 0 }} 
                                            value={c.imei2 || ''} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCart(cart.map(item => item.product === c.product ? { ...item, imei2: val } : item));
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {cart.length === 0 && <div className="text-secondary" style={{textAlign: 'center', padding: '2rem 0'}}>Cart is empty</div>}
                </div>

                <div>
                    {hasGstInCart ? (
                        <>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem'}}><span className="text-secondary">Taxable (GST items)</span> <span>₹{taxSummary.taxableAmount.toFixed(2)}</span></div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem'}}><span className="text-secondary">CGST {CGST_RATE}%</span> <span>₹{taxSummary.cgstAmount.toFixed(2)}</span></div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}><span className="text-secondary">SGST {SGST_RATE}%</span> <span>₹{taxSummary.sgstAmount.toFixed(2)}</span></div>
                        </>
                    ) : (
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}><span className="text-secondary">Subtotal</span> <span>₹{subtotal.toFixed(2)}</span></div>
                    )}
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold'}}><span>Final Total</span> <span>₹{finalTotal.toFixed(2)}</span></div>
                    
                    <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px'}}>
                        <button className={`btn ${paymentMode === 'Cash' ? 'btn-green' : 'btn-secondary'}`} style={{padding: '0.4rem', fontSize: '0.85rem', borderRadius: '8px', flex: 1}} onClick={() => setPaymentMode('Cash')}>💵 Cash</button>
                        <button className={`btn ${paymentMode === 'Online' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem', fontSize: '0.85rem', borderRadius: '8px', flex: 1}} onClick={() => setPaymentMode('Online')}>📱 Online</button>
                    </div>

                    <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button className="btn btn-green" style={{flex: 1, padding: '0.6rem'}} onClick={checkout} disabled={isGenerating}>
                            <Receipt size={18} style={{marginRight: '5px'}} /> {isGenerating ? 'Generating Receipt...' : 'Cash Out & Send Receipt'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden HTML Receipt Template for Canvas Rendering */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', pointerEvents: 'none', zIndex: -1 }}>
                <div id="receipt-capture" style={{ display: 'none', width: '380px', background: '#ffffff', color: '#000000', padding: '24px', fontFamily: 'monospace', borderRadius: '0px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '2px dashed #000', paddingBottom: '12px' }}>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: 'bold' }}>{shopName}</h2>
                        {hasGstInCart && (
                            <>
                                <p style={{ margin: '4px 0', fontSize: '0.85rem', fontWeight: 'bold' }}>TAX INVOICE</p>
                                {gstSettings.gstin && <p style={{ margin: '0', fontSize: '0.8rem' }}>GSTIN: {gstSettings.gstin}</p>}
                            </>
                        )}
                        <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#555' }}>Thank you for your business!</p>
                    </div>
                    
                    <div style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Date:</span> <strong>{new Date().toLocaleDateString()}</strong>
                        </div>
                        {customerName && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Customer:</span> <strong>{customerName}</strong>
                            </div>
                        )}
                        {customerPhone && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Phone:</span> <strong>{customerPhone}</strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Payment:</span> <strong>{paymentMode}</strong>
                        </div>
                    </div>

                    <div style={{ borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '12px 0', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '8px' }}>
                            <span style={{ flex: 2 }}>Item</span>
                            <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
                            <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                        </div>
                        {cart.map(c => (
                            <div key={c.product} style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ flex: 2 }}>{c.name}</span>
                                    <span style={{ flex: 1, textAlign: 'center' }}>{c.quantity}</span>
                                    <span style={{ flex: 1, textAlign: 'right' }}>₹{c.total}</span>
                                </div>
                                {c.category === 'Second Hand Mobile' && (c.imei1 || c.imei2) && (
                                    <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '2px', fontFamily: 'monospace' }}>
                                        {c.imei1 && `IMEI 1: ${c.imei1}`}
                                        {c.imei1 && c.imei2 && ' | '}
                                        {c.imei2 && `IMEI 2: ${c.imei2}`}
                                    </div>
                                )}
                                <div style={{ fontSize: '0.75rem', color: '#555', fontStyle: 'italic', marginTop: '2px' }}>
                                    Section: {c.category || 'Others'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#555' }}>
                                    {c.applyGst ? `GST: CGST ${CGST_RATE}% + SGST ${SGST_RATE}%` : 'No GST'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasGstInCart && cart.length > 0 && (
                        <div style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Taxable (GST items)</span><span>₹{taxSummary.taxableAmount.toFixed(2)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CGST {CGST_RATE}%</span><span>₹{taxSummary.cgstAmount.toFixed(2)}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SGST {SGST_RATE}%</span><span>₹{taxSummary.sgstAmount.toFixed(2)}</span></div>
                        </div>
                    )}
                    <div style={{ textAlign: 'right', fontSize: '1.2rem' }}>
                        <span>Total: </span>
                        <strong style={{ fontSize: '1.5rem' }}>₹{finalTotal.toFixed(2)}</strong>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.8rem', color: '#777' }}>
                        System generated receipt
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PosBilling;
