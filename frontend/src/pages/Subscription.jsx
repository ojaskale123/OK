import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Database } from 'lucide-react';

const Subscription = () => {
    const { token, updateUser, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const plans = [
        { 
            name: 'Shopkeeper', 
            price: 1000, 
            subtitle: 'Full Shop Management Software\n(Used Devices + Repair) For Indian Users',
            features: ['1 Business Locations', '6 Users', 'Unlimited Products', 'Unlimited Invoices', 'Repair Module', 'Usedphones Module'], 
            icon: ShieldCheck,
            footerText: 'For Dealers who sell & repair phones, laptops, IPads etc'
        },
        { 
            name: 'Wholesale', 
            price: 2500, 
            subtitle: 'Repair Shop Module for 2 Shops',
            features: ['2 Business Locations', '12 Users', 'Unlimited Products', 'Unlimited Invoices', 'Repair Module'], 
            icon: Zap, 
            popular: true,
            footerText: 'Repair Shop Module for 2 Shops'
        },
        { 
            name: 'Retail Pro', 
            price: 4500, 
            subtitle: 'Full Shop Management Software\n(Used Devices + Repair) Global Version',
            features: ['1 Business Locations', '6 Users', 'Unlimited Products', 'Unlimited Invoices', 'Repair Module', 'Usedphones Module'], 
            icon: Database,
            footerText: 'For Dealers who sell & repair phones, laptops, IPads etc'
        }
    ];

    const upgradePlan = async (planName, price) => {
        setLoading(true);
        // Load razorpay script if not present
        if(!window.Razorpay) {
            alert("Razorpay SDK not loaded.");
            setLoading(false);
            return;
        }

        try {
            // Create order
            const orderRes = await fetch('https://ok-ax2v.onrender.com/api/payments/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ amount: price, planName })
            });
            const { order } = await orderRes.json();

            const options = {
                key: 'dummy_key', // Handled by server actually, but razorpay needs it on frontend to not throw error in real env
                amount: order.amount,
                currency: "INR",
                name: "OK ERP",
                description: `Upgrade to ${planName}`,
                order_id: order.id,
                handler: async function (response) {
                    // Verify payment
                    const verifyRes = await fetch('https://ok-ax2v.onrender.com/api/payments/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature || 'mock_sig',
                            planName
                        })
                    });
                    const data = await verifyRes.json();
                    alert("Payment Success! 500 Gamification Credits Awarded.");
                    updateUser({ subscription: data.subscription, walletBalance: user.walletBalance + 500 });
                    navigate('/dashboard');
                },
                theme: { color: "#8b5cf6" }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response){
                alert("Payment Failed. Mocking success anyway for demo.");
                // For this demo, let's trigger success anyway
                options.handler({ razorpay_payment_id: 'mock', razorpay_order_id: order.id });
            });
            rzp.open();
        } catch(err) {
            console.error(err);
            // Mock success for offline testing
            const verifyRes = await fetch('https://ok-ax2v.onrender.com/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ razorpay_order_id: 'mock', razorpay_payment_id: 'mock', razorpay_signature: 'mock', planName })
            });
            const data = await verifyRes.json();
            alert("Payment Mocked Successfully! 500 Gamification Credits Awarded. UI Updated.");
            updateUser({ subscription: data.subscription, walletBalance: user.walletBalance + 500 });
            navigate('/dashboard');
        }
        setLoading(false);
    };

    const startTrial = async (planName) => {
        setLoading(true);
        try {
            const res = await fetch('https://ok-ax2v.onrender.com/api/payments/start-trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ planName })
            });
            const data = await res.json();
            updateUser({ subscription: data.subscription });
            alert(`Started 3-Day Free Trial for ${planName}!`);
            navigate('/dashboard');
        } catch(e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in">
            <div style={{textAlign: 'center', marginBottom: '3rem'}}>
                <h2 className="text-gradient" style={{fontSize: '2.5rem', marginBottom: '1rem'}}>Choose Your Plan Or Try Free</h2>
                <p className="text-secondary">Explore all premium limits free for 3 days without a credit card.</p>
            </div>

            <div style={{display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                {plans.map(p => (
                    <div key={p.name} className="glass-card" style={{width: '360px', display: 'flex', flexDirection: 'column', position: 'relative', border: p.popular ? '2px solid var(--neon-purple)' : undefined, padding: '2.5rem 1.5rem'}}>
                        {p.popular && <div style={{position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gradient)', padding: '5px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px'}}>MOST POPULAR</div>}
                        
                        <div style={{textAlign: 'center', flex: 1}}>
                            <p.icon size={32} color={p.popular ? 'var(--neon-purple)' : 'var(--neon-blue)'} style={{margin: '0 auto 0.5rem'}} />
                            <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>{p.name}</h3>
                            <p style={{fontSize: '1rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', minHeight: '3rem', margin: '0 0.5rem'}}>{p.subtitle}</p>
                            
                            <div style={{margin: '2rem 0', padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                                {p.features.map(f => (
                                    <div key={f} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.2rem', fontSize: '1.05rem', color: 'var(--text-primary)'}}>
                                        <span style={{color: 'var(--ok-green)', fontWeight: 'bold', fontSize: '1.2rem'}}>✓</span> {f}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="text-gradient" style={{fontSize: '2.8rem', fontWeight: 800, marginBottom: '1.5rem'}}>₹{p.price.toLocaleString('en-IN')}<span style={{fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 500}}>{' '}/ 1 Years</span></div>
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: 'auto'}}>
                            <button className={`btn ${p.popular ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold'}} disabled={loading} onClick={() => upgradePlan(p.name, p.price)}>
                                {loading ? 'Processing...' : `Register & subscribe`}
                            </button>
                            <button className="btn btn-secondary" style={{color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', background: 'transparent', padding: '0.8rem'}} disabled={loading} onClick={() => startTrial(p.name)}>
                                Start 3-Day Free Trial
                            </button>
                            {p.footerText && <div style={{background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', marginTop: '0.5rem', textAlign: 'center'}}>
                                <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0}}>{p.footerText}</p>
                            </div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Signature Watermark */}
            <img src="/ojas-signature.png" alt="Ojas Kale Signature" style={{position: 'fixed', bottom: '20px', right: '30px', width: '150px', opacity: 0.7, zIndex: 9999, pointerEvents: 'none', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.4))'}} />
        </div>
    );
};

export default Subscription;
