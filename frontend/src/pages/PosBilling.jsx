import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Plus, Receipt, Search } from 'lucide-react';

const PosBilling = () => {
    const { token } = useAuth();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [billingMode, setBillingMode] = useState('Customer'); // 'Customer' or 'Retailer'

    useEffect(() => {
        fetch('https://ok-ax2v.onrender.com/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setProducts(data));
    }, [token]);

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
            setCart([...cart, { product: product._id, name: product.name, price: activePrice, quantity: 1, total: activePrice, stockQuantity: product.stockQuantity }]);
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

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const subtotal = cart.reduce((acc, curr) => acc + curr.total, 0);
    const finalTotal = subtotal;

    const checkout = async () => {
        if(cart.length === 0 || !customerName) return alert("Add items and customer name");
        try {
            const res = await fetch('https://ok-ax2v.onrender.com/api/pos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ customerName, customerPhone, items: cart, subtotal, discountApplied: 0, finalTotal })
            });
            if(res.ok) {
                setCart([]); setCustomerName(''); setCustomerPhone('');
                setSuccessMsg('Invoice generated! 🎉 +5 Gamification Credits added.');
                setTimeout(() => setSuccessMsg(''), 4000);
            }
        } catch(e) { console.error(e); }
    }

    return (
        <div className="animate-fade-in" style={{display: 'flex', gap: '2rem'}}>
            <div style={{flex: 2}}>
                <h2 className="text-gradient" style={{marginBottom: '1rem'}}>Point of Sale (POS)</h2>
                {successMsg && <div className="glass-card" style={{borderColor: 'var(--ok-green)', marginBottom: '1rem'}}><p className="amount-receive">{successMsg}</p></div>}
                
                {/* Billing Mode Toggle */}
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center'}}>
                    <span className="text-secondary" style={{fontSize: '0.9rem'}}>Sale Type:</span>
                    <button className={`btn ${billingMode === 'Customer' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '20px'}} onClick={() => setBillingMode('Customer')}>Customer</button>
                    <button className={`btn ${billingMode === 'Retailer' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '20px'}} onClick={() => setBillingMode('Retailer')}>Retailer</button>
                </div>

                <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem'}}>
                    {['All', 'Second Hand Mobile', 'Batteries', 'Accessories', 'Others'].map(cat => (
                        <button key={cat} className={`btn ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 0.8rem', fontSize: '0.85rem'}} onClick={() => setCategoryFilter(cat)}>{cat}</button>
                    ))}
                </div>

                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <input 
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
                
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '10px'}}>
                    {filteredProducts.map(p => (
                        <div key={p._id} className="glass-card" style={{cursor: 'pointer', padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column'}} onClick={() => addToCart(p)}>
                            {p.image ? (
                                <div style={{height: '120px', width: '100%', backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center'}} />
                            ) : (
                                <div style={{height: '120px', width: '100%', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                    <span style={{opacity: 0.2}}>No Image</span>
                                </div>
                            )}
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
                
                <div className="form-group"><input placeholder="Customer Name" className="form-input" value={customerName} onChange={e=>setCustomerName(e.target.value)} /></div>
                <div className="form-group"><input placeholder="Phone (Optional)" className="form-input" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} /></div>

                <div style={{flex: 1, borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', margin: '1rem 0', padding: '1rem 0', overflowY: 'auto'}}>
                    {cart.map(c => (
                        <div key={c.product} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem'}}>
                            <div style={{flex: 1}}>{c.name}</div>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '2px 8px'}}>
                                <button className="btn" style={{padding: '0px 6px', background: 'transparent', border: 'none', color: '#fff'}} onClick={() => updateCartQuantity(c.product, -1)}>-</button>
                                <span className="text-secondary" style={{fontSize: '0.85rem', width: '20px', textAlign: 'center'}}>{c.quantity}</span>
                                <button className="btn" style={{padding: '0px 6px', background: 'transparent', border: 'none', color: '#fff'}} onClick={() => updateCartQuantity(c.product, 1)}>+</button>
                            </div>
                            <div style={{width: '70px', textAlign: 'right', fontWeight: 'bold'}}>₹{c.total}</div>
                        </div>
                    ))}
                    {cart.length === 0 && <div className="text-secondary" style={{textAlign: 'center', padding: '2rem 0'}}>Cart is empty</div>}
                </div>

                <div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}><span className="text-secondary">Subtotal</span> <span>₹{subtotal.toFixed(2)}</span></div>
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 'bold'}}><span>Final Total</span> <span>₹{finalTotal.toFixed(2)}</span></div>
                    <button className="btn btn-green" style={{width: '100%'}} onClick={checkout}><Receipt /> Checkout & Print</button>
                </div>
            </div>
        </div>
    );
};

export default PosBilling;
