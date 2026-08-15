import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, Database } from 'lucide-react';

const Subscription = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const isWorker = user?.role === 'worker';
    const isMaster = user?._id === 'master-admin-id' || user?.email === 'ojask68@gmail.com' || user?.email === 'frndztelecomm61@gmail.com';

    const plans = [
        {
            name: '1 Year Plan',
            price: 5000,
            subtitle: 'Full access to every feature for 12 months.',
            features: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot'],
            icon: ShieldCheck,
            footerText: 'Best for shops that want one year of full ERP access.',
        },
        {
            name: '2 Year Plan',
            price: 9000,
            subtitle: 'Full access to every feature for 24 months.',
            features: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot'],
            icon: Zap,
            popular: true,
            footerText: 'Best value with extended protection and support.',
        },
        {
            name: '3 Year Plan',
            price: 12000,
            subtitle: 'Full access to every feature for 36 months.',
            features: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot'],
            icon: Database,
            footerText: 'Great for long-term shops that want stability.',
        },
        {
            name: '5 Year Plan',
            price: 15000,
            subtitle: 'Full access to every feature for 60 months.',
            features: ['Inventory', 'POS billing', 'Cashbook', 'GST reports', 'Repair module', 'Attendance', 'WhatsApp bot'],
            icon: Database,
            footerText: 'Maximum long-term value for serious shop owners.',
        }
    ];

    if (isWorker || isMaster) {
        return (
            <div className="animate-fade-in" style={{ textAlign: 'center', marginTop: '5rem' }}>
                <ShieldCheck size={64} color="var(--neon-purple)" style={{ margin: '0 auto 2rem' }} />
                <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                    {isMaster ? 'Master Admin Account' : 'Worker Account Active'}
                </h2>
                <p className="text-secondary" style={{ fontSize: '1.2rem' }}>
                    {isMaster
                        ? 'You have unlimited lifetime access. No subscription required.'
                        : 'Your subscription is managed by your shop owner. You have free access!'}
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')} style={{ marginTop: '2rem', padding: '0.8rem 2rem' }}>
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Subscription Plans</h2>
                <p className="text-secondary">Choose your duration and pay via UPI. All plans include every feature in the app.</p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {plans.map((p) => (
                    <div key={p.name} className="glass-card" style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', position: 'relative', border: p.popular ? '2px solid var(--neon-purple)' : undefined, padding: '2.5rem 1.5rem' }}>
                        {p.popular && (
                            <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: 'var(--accent-gradient)', padding: '5px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                MOST POPULAR
                            </div>
                        )}
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <p.icon size={32} color={p.popular ? 'var(--neon-purple)' : 'var(--neon-blue)'} style={{ margin: '0 auto 0.5rem' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{p.name}</h3>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', minHeight: '3rem', margin: '0 0.5rem' }}>{p.subtitle}</p>
                            <div style={{ margin: '2rem 0', padding: '2rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {p.features.map((feature) => (
                                    <div key={feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.2rem', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                        <span style={{ color: 'var(--ok-green)', fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>
                                        {feature}
                                    </div>
                                ))}
                            </div>
                            <div className="text-gradient" style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1.5rem' }}>
                                ₹{p.price.toLocaleString('en-IN')}
                                <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 500 }}> / {p.name === '5 Year Plan' ? '5 years' : p.name === '3 Year Plan' ? '3 years' : p.name === '2 Year Plan' ? '2 years' : '1 year'}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: 'auto' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{p.footerText}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2.5rem' }}>
                <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Payment Instructions</h3>
                    <p className="text-secondary" style={{ lineHeight: 1.7, marginBottom: '1.5rem' }}>
                        Scan the QR code using PhonePe or any UPI app. After payment, send the screenshot to WhatsApp at <strong>9834470250</strong>. You will receive your login username and password within 24 hours.
                    </p>
                    <div style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                        <img src="/payment-qr.png" alt="Payment QR Code" style={{ width: '100%' }} />
                    </div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        <p style={{ margin: 0 }}><strong>UPI ID:</strong> babuanuibhav071@ibl</p>
                        <p style={{ margin: '0.25rem 0 0' }}><strong>Bank:</strong> Bank of India</p>
                        <p style={{ margin: '0.25rem 0 0' }}><strong>Last 4 digits:</strong> 4872</p>
                    </div>
                    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}>
                        <p className="text-secondary" style={{ marginBottom: '0.75rem' }}>
                            Send the payment screenshot to WhatsApp at <strong>9834470250</strong>.
                        </p>
                        <p style={{ margin: 0, fontWeight: 700 }}>You will get username & password within 24 hours.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscription;
