import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, Database, TrendingUp, Users, ShoppingCart } from 'lucide-react';

const LandingPage = () => {
    return (
        <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column'}}>
            <nav style={{display: 'flex', justifyContent: 'space-between', padding: '2rem 4rem', alignItems: 'center'}} className="glass-card">
                <h2 className="text-gradient" style={{fontSize: '2rem', letterSpacing: '2px'}}>OK ERP</h2>
                <div style={{display: 'flex', gap: '1.5rem'}}>
                    <Link to="/login" className="btn btn-secondary">Login</Link>
                    <Link to="/login" className="btn btn-primary">Start Free Trial</Link>
                </div>
            </nav>

            <main style={{flex: 1, padding: '4rem', textAlign: 'center'}}>
                <section className="animate-fade-in" style={{marginBottom: '6rem', maxWidth: '800px', margin: '0 auto 6rem'}}>
                    <h1 style={{fontSize: '4rem', marginBottom: '1.5rem', lineHeight: 1.1}}>The Ultimate Business OS for <span className="text-gradient">Growth</span></h1>
                    <p className="text-secondary" style={{fontSize: '1.25rem', marginBottom: '2.5rem'}}>
                        Combine Point of Sale, Smart Inventory, and a WhatsApp-style Cashbook Ledger in one extremely addicted Gamified experience.
                    </p>
                    <Link to="/login" className="btn btn-primary" style={{padding: '1rem 2.5rem', fontSize: '1.2rem', borderRadius: '50px'}}>Join OK Now</Link>
                </section>

                <section style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '6rem'}}>
                    <div className="glass-card" style={{padding: '3rem 2rem'}}>
                        <ShoppingCart size={48} color="var(--neon-blue)" style={{marginBottom: '1rem'}} />
                        <h3 style={{marginBottom: '1rem'}}>Intelligent POS</h3>
                        <p className="text-secondary">Instant GST calculation, barcode support, and beautiful seamless invoicing.</p>
                    </div>
                    <div className="glass-card" style={{padding: '3rem 2rem'}}>
                        <Users size={48} color="var(--ok-green)" style={{marginBottom: '1rem'}} />
                        <h3 style={{marginBottom: '1rem'}}>Chat Cashbook</h3>
                        <p className="text-secondary">Stop using boring ledgers. Message "+₹500 received" inside beautifully managed threads.</p>
                    </div>
                    <div className="glass-card" style={{padding: '3rem 2rem'}}>
                        <TrendingUp size={48} color="var(--neon-purple)" style={{marginBottom: '1rem'}} />
                        <h3 style={{marginBottom: '1rem'}}>Gamified Addictive UI</h3>
                        <p className="text-secondary">Earn wallet credits for sales, hit daily streaks, and stay motivated!</p>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default LandingPage;
