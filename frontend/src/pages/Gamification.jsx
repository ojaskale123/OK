import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Gift, Copy, Flame, Trophy } from 'lucide-react';

const Gamification = () => {
    const { user, updateUser } = useAuth();
    const [scratched, setScratched] = useState(false);

    const handleScratch = () => {
        if(scratched) return;
        setScratched(true);
        const winAmount = Math.floor(Math.random() * 50) + 10;
        alert(`🎉 You won ${winAmount} Credits!`);
        updateUser({ walletBalance: (user?.walletBalance || 0) + winAmount });
    };

    return (
        <div className="animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h2 className="text-gradient">Rewards & Gamification</h2>
                <div className="glass-card" style={{padding: '0.5rem 1.5rem', color: '#fbbf24', fontWeight: 'bold'}}>
                    Wallet: {user?.walletBalance || 0} Credits
                </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem'}}>
                {/* Streak System */}
                <div className="glass-card" style={{textAlign: 'center', padding: '2rem'}}>
                    <Flame size={48} color="var(--ok-red)" style={{margin: '0 auto 1rem'}} />
                    <h3>Daily Streak</h3>
                    <h1 style={{fontSize: '3rem', color: 'var(--ok-red)', margin: '1rem 0'}}>4 Days</h1>
                    <p className="text-secondary">Login tomorrow to reach 5 days and earn a bonus chest!</p>
                </div>

                {/* Scratch Card */}
                <div className="glass-card" style={{textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <Gift size={48} color="var(--neon-purple)" style={{margin: '0 auto 1rem'}} />
                    <h3>Daily Scratch Card</h3>
                    <div 
                        onClick={handleScratch}
                        style={{
                            background: scratched ? 'rgba(0,0,0,0.3)' : 'var(--accent-gradient)',
                            width: '200px', height: '100px', borderRadius: '12px', marginTop: '1.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: scratched ? 'default' : 'pointer', border: '1px dashed var(--border-color)'
                        }}
                    >
                        {scratched ? <span style={{color: '#fbbf24', fontWeight: 'bold', fontSize: '1.5rem'}}>Revealed!</span> : <span>Click to Scratch</span>}
                    </div>
                </div>

                {/* Referral System */}
                <div className="glass-card" style={{textAlign: 'center', padding: '2rem'}}>
                    <Trophy size={48} color="var(--ok-green)" style={{margin: '0 auto 1rem'}} />
                    <h3>Refer & Earn</h3>
                    <p className="text-secondary" style={{marginBottom: '1rem'}}>Invite a friend to OK ERP and you both get 500 Credits instantly!</p>
                    <div style={{display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', overflow: 'hidden'}}>
                        <input className="form-input" style={{border: 'none', borderRadius: 0}} readOnly value={`OK-${user?._id?.substring(0, 5).toUpperCase()}`} />
                        <button className="btn btn-green" style={{borderRadius: 0}} onClick={() => alert('Code Copied!')}><Copy size={18} /></button>
                    </div>
                </div>
            </div>

            <div className="glass-card">
                <h3 style={{marginBottom: '1rem'}}>Add-ons Store (Use Credits)</h3>
                <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                    <div style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', flex: 1}}>
                        <h4>+300 Inventory Slots</h4>
                        <p className="text-secondary" style={{margin: '0.5rem 0'}}>Add limits to your plan.</p>
                        <button className="btn btn-secondary">Use ₹500 or 5000 Credits</button>
                    </div>
                    <div style={{padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', flex: 1}}>
                        <h4>Custom Connect WhatsApp</h4>
                        <p className="text-secondary" style={{margin: '0.5rem 0'}}>Auto-send POS invoices to clients.</p>
                        <button className="btn btn-secondary">Use ₹1500 or 15000 Credits</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Gamification;
