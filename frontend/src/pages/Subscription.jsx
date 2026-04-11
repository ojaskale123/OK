import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Database } from 'lucide-react';

const Subscription = () => {
    const { token, updateUser, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const plans = [
        { name: 'Shopkeeper', price: 5000, features: ['POS Access', 'Basic Reports', 'Up to 1000 Inventory Items'], icon: ShieldCheck },
        { name: 'Wholesale', price: 10000, features: ['Everything in Shopkeeper', 'Chat Cashbook Ledger', 'Up to 5000 Inventory Items'], icon: Zap, popular: true },
        { name: 'Retail Pro', price: 15000, features: ['Everything in Wholesale', 'Unlimited Inventory', 'Gamified Staff Accounts'], icon: Database }
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
            const orderRes = await fetch('http://localhost:5000/api/payments/create-order', {
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
                    const verifyRes = await fetch('http://localhost:5000/api/payments/verify', {
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
            const verifyRes = await fetch('http://localhost:5000/api/payments/verify', {
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
            const res = await fetch('http://localhost:5000/api/payments/start-trial', {
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
                    <div key={p.name} className="glass-card" style={{width: '320px', display: 'flex', flexDirection: 'column', position: 'relative', border: p.popular ? '2px solid var(--neon-purple)' : undefined}}>
                        {p.popular && <div style={{position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gradient)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold'}}>MOST POPULAR</div>}
                        
                        <div style={{marginBottom: '1.5rem', textAlign: 'center'}}>
                            <p.icon size={48} color={p.popular ? 'var(--neon-purple)' : 'var(--neon-blue)'} style={{margin: '1rem auto'}} />
                            <h3>{p.name}</h3>
                            <div className="text-gradient" style={{fontSize: '2rem', fontWeight: 800, margin: '1rem 0'}}>₹{p.price}<span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}>/yr</span></div>
                        </div>

                        <div style={{flex: 1, marginBottom: '2rem'}}>
                            {p.features.map(f => (
                                <div key={f} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
                                    <span style={{color: 'var(--ok-green)'}}>✓</span> {f}
                                </div>
                            ))}
                        </div>

                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                            <button className={`btn ${p.popular ? 'btn-primary' : 'btn-secondary'}`} disabled={loading} onClick={() => upgradePlan(p.name, p.price)}>
                                {loading ? 'Processing...' : `Upgrade to ${p.name}`}
                            </button>
                            <button className="btn btn-secondary" style={{color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', background: 'transparent'}} disabled={loading} onClick={() => startTrial(p.name)}>
                                Start 3-Day Free Trial
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Subscription;
