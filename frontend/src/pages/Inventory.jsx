import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Package, AlertTriangle, Plus, Barcode, TrendingUp, Image as ImageIcon, Trash2 } from 'lucide-react';

const CATEGORIES = ["Second Hand Mobile", "Batteries", "Accessories", "Others"];

const Inventory = () => {
    const { token, user } = useAuth();
    const [products, setProducts] = useState([]);
    const [filterCat, setFilterCat] = useState('All');
    
    // Form States
    const [barcode, setBarcode] = useState('');
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Others');
    const [image, setImage] = useState('');
    const [buyPrice, setBuyPrice] = useState('');
    const [price, setPrice] = useState(''); // Customer Price
    const [retailerPrice, setRetailerPrice] = useState(''); // Retailer Price
    const [stock, setStock] = useState('');
    
    const [editProductId, setEditProductId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const [error, setError] = useState(null);

    const plan = user?.subscription?.plan || 'None';

    const fetchProducts = async () => {
        try {
            const res = await fetch('https://ok-ax2v.onrender.com/api/products', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if(Array.isArray(data)) {
                setProducts(data);
            }
        } catch(e) {}
    }

    useEffect(() => { fetchProducts(); }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const addProduct = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            const res = await fetch('https://ok-ax2v.onrender.com/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, barcode, category, image, buyPrice: Number(buyPrice), price: Number(price), retailerPrice: Number(retailerPrice || price), stockQuantity: Number(stock) })
            });
            const data = await res.json();
            if(!res.ok) throw new Error(data.message);
            
            setProducts([...products, data]);
            setName(''); setBarcode(''); setCategory('Others'); setImage(''); setBuyPrice(''); setPrice(''); setRetailerPrice(''); setStock('');
        } catch(err) {
            setError(err.message);
        }
    }

    const startEdit = (p) => {
        setEditProductId(p._id);
        setEditForm({ name: p.name, barcode: p.barcode, category: p.category, image: p.image, buyPrice: p.buyPrice, price: p.price, retailerPrice: p.retailerPrice || p.price, stockQuantity: p.stockQuantity });
    }

    const saveEdit = async (id) => {
        try {
            const res = await fetch(`https://ok-ax2v.onrender.com/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(editForm)
            });
            const data = await res.json();
            setProducts(products.map(p => p._id === id ? data : p));
            setEditProductId(null);
        } catch(e) { console.error(e); }
    }

    const deleteProduct = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            const res = await fetch(`https://ok-ax2v.onrender.com/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setProducts(products.filter(p => p._id !== id));
            }
        } catch(e) { console.error(e); }
    }

    const filteredProducts = filterCat === 'All' ? products : products.filter(p => p.category === filterCat);
    const totalInventoryValue = filteredProducts.reduce((acc, p) => acc + (p.buyPrice * p.stockQuantity || 0), 0);
    const expectedProfit = filteredProducts.reduce((acc, p) => acc + ((p.price - (p.buyPrice || 0)) * p.stockQuantity), 0);

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
                <div className="glass-card" style={{ width: '320px', height: 'max-content' }}>
                    <h3 style={{marginBottom: '1rem'}}>Stock Entry</h3>
                    <form onSubmit={addProduct}>
                        
                        {/* Image Upload Area */}
                        <div style={{marginBottom: '1rem', textAlign: 'center'}}>
                            <label style={{cursor: 'pointer', display: 'block', padding: '1rem', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)'}}>
                                {image ? (
                                    <img src={image} alt="Preview" style={{maxHeight: '100px', margin: '0 auto', borderRadius: '4px'}} />
                                ) : (
                                    <div className="text-secondary">
                                        <ImageIcon size={24} style={{margin: '0 auto 8px'}} />
                                        <div style={{fontSize: '0.8rem'}}>Upload Image</div>
                                    </div>
                                )}
                                <input type="file" accept="image/*" style={{display: 'none'}} onChange={handleImageUpload} />
                            </label>
                        </div>

                        <div className="form-group" style={{position: 'relative'}}>
                            <input placeholder="Barcode ID (Optional)" className="form-input" value={barcode} onChange={e=>setBarcode(e.target.value)} style={{paddingLeft: '35px'}} />
                            <Barcode size={18} className="text-secondary" style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)'}} />
                        </div>
                        
                        <div className="form-group">
                            <input placeholder="Product Name" className="form-input" value={name} onChange={e=>setName(e.target.value)} required />
                        </div>
                        
                        <div className="form-group">
                            <select className="form-input" value={category} onChange={e=>setCategory(e.target.value)}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div style={{display: 'flex', gap: '0.5rem'}}>
                            <div className="form-group" style={{flex: 1}}>
                                <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Buy Price (₹)</label>
                                <input placeholder="Cost" type="number" className="form-input" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{flex: 1}}>
                                <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Cust. Price (₹)</label>
                                <input placeholder="Retail" type="number" className="form-input" value={price} onChange={e=>setPrice(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{flex: 1}}>
                                <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Wholesale (₹)</label>
                                <input placeholder="Dealer" type="number" className="form-input" value={retailerPrice} onChange={e=>setRetailerPrice(e.target.value)} required />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Stock Quantity</label>
                            <input placeholder="Quantity" type="number" className="form-input" value={stock} onChange={e=>setStock(e.target.value)} required />
                        </div>
                        
                        <button className="btn btn-primary" style={{width: '100%', marginTop: '0.5rem'}}><Plus size={18} /> Catalog Item</button>
                    </form>
                    <div style={{marginTop: '1.5rem', fontSize: '0.85rem', textAlign: 'center'}} className="text-secondary">
                        Plan limit: <span className="text-gradient" style={{fontWeight: 'bold'}}>{plan === 'Shopkeeper' ? '1,000' : plan === 'Wholesale' ? '5,000' : plan === 'Retail Pro' ? 'Unlimited' : 'None'}</span> items
                    </div>
                </div>

                {/* Product List / Cards */}
                <div style={{ flex: 1, minWidth: '500px' }}>
                    {/* Category Filter Pipeline */}
                    <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                        <button className={`btn ${filterCat === 'All' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem'}} onClick={() => setFilterCat('All')}>All</button>
                        {CATEGORIES.map(c => (
                            <button key={c} className={`btn ${filterCat === c ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '0.4rem 1rem', fontSize: '0.85rem'}} onClick={() => setFilterCat(c)}>{c}</button>
                        ))}
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem'}}>
                        {filteredProducts.map(p => {
                            const margin = p.price - (p.buyPrice || 0);
                            const marginPercent = p.buyPrice ? ((margin / p.buyPrice) * 100).toFixed(0) : 100;
                            
                            if (editProductId === p._id) {
                                return (
                                    <div key={p._id} className="glass-card" style={{padding: '1rem', background: 'rgba(139, 92, 246, 0.1)'}}>
                                        <input className="form-input" style={{marginBottom: '0.5rem', fontSize: '0.9rem'}} value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} />
                                        <select className="form-input" style={{marginBottom: '0.5rem', padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.category} onChange={e=>setEditForm({...editForm, category: e.target.value})}>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                            <input type="number" placeholder="Buy" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.buyPrice} onChange={e=>setEditForm({...editForm, buyPrice: e.target.value})} />
                                            <input type="number" placeholder="Cust." className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.price} onChange={e=>setEditForm({...editForm, price: e.target.value})} />
                                            <input type="number" placeholder="Retailer" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem'}} value={editForm.retailerPrice} onChange={e=>setEditForm({...editForm, retailerPrice: e.target.value})} />
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'}}>
                                            <input type="number" placeholder="Qty" className="form-input" style={{padding: '0.4rem', fontSize: '0.8rem', width: '60px'}} value={editForm.stockQuantity} onChange={e=>setEditForm({...editForm, stockQuantity: e.target.value})} />
                                            <button className="btn btn-primary" style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}} onClick={() => saveEdit(p._id)}>Save</button>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div key={p._id} className="glass-card" style={{padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                                    {p.image ? (
                                        <div style={{height: '140px', width: '100%', backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center'}} />
                                    ) : (
                                        <div style={{height: '140px', width: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <ImageIcon size={32} className="text-secondary" style={{opacity: 0.5}} />
                                        </div>
                                    )}
                                    
                                    <div style={{padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                                            <div>
                                                <div style={{fontWeight: 600, color: '#fff', fontSize: '1rem', lineHeight: 1.2}}>{p.name}</div>
                                                <div className="text-secondary" style={{fontSize: '0.75rem', marginTop: '4px'}}>{p.category}</div>
                                            </div>
                                            <div className="amount-receive" style={{fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', fontWeight: 'bold'}}>+{marginPercent}%</div>
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
                        {filteredProducts.length === 0 && <div style={{gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>No products found in this category.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Inventory;
