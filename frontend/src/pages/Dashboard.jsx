import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Package, Users, Wallet, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeCard, setActiveCard] = useState(null);
  
  const plan = user?.subscription?.plan || 'None';
  const isActive = user?.subscription?.isActive;

  if(!isActive || plan === 'None') {
      return (
          <div className="glass-card" style={{textAlign: 'center', padding: '4rem 2rem'}}>
             <Crown size={64} color="var(--neon-purple)" style={{marginBottom: '1rem'}}/>
             <h2>Your Subscription is Inactive</h2>
             <p className="text-secondary" style={{margin: '1rem 0 2rem'}}>Please upgrade to a plan to unlock the Dashboard capabilities.</p>
             <Link to="/plans" className="btn btn-primary">View Pricing Plans</Link>
          </div>
      );
  }

  const toggleCard = (card) => {
      setActiveCard(activeCard === card ? null : card);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="text-gradient">Business Overview</h2>
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem' }}>
            <div><span style={{color: 'var(--ok-green)'}}>Plan:</span> {plan}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Sales Card */}
        <div className="glass-card" style={{ cursor: 'pointer', outline: activeCard === 'sales' ? '2px solid var(--neon-blue)' : 'none' }} onClick={() => toggleCard('sales')}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                <span className="text-secondary">Today's Sales</span>
                <TrendingUp color="var(--neon-blue)" />
            </div>
            <h3>₹0</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p className="text-secondary" style={{fontSize: '0.85rem'}}>No sales recorded yet</p>
                {activeCard === 'sales' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {activeCard === 'sales' && (
                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease'}}>
                    <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>Top Items Sold Today:</p>
                    <ul style={{listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                        <li>No items sold yet.</li>
                    </ul>
                </div>
            )}
        </div>

        {/* Stock Card */}
        <div className="glass-card" style={{ cursor: 'pointer', outline: activeCard === 'stock' ? '2px solid var(--ok-red)' : 'none' }} onClick={() => toggleCard('stock')}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                <span className="text-secondary">Low Stock Items</span>
                <Package color="var(--ok-red)" />
            </div>
            <h3>0</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p className="text-secondary" style={{fontSize: '0.85rem'}}>All stock optimal</p>
                {activeCard === 'stock' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {activeCard === 'stock' && (
                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease'}}>
                    <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>Critically Low:</p>
                    <ul style={{listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                        <li>Inventory is perfectly stocked.</li>
                    </ul>
                    <Link to="/inventory" className="text-gradient" style={{display: 'inline-block', marginTop: '0.5rem', fontSize: '0.85rem'}}>Manage Inventory ➔</Link>
                </div>
            )}
        </div>

        {/* Cashbook Card */}
        <div className="glass-card" style={{ cursor: 'pointer', outline: activeCard === 'cashbook' ? '2px solid var(--neon-purple)' : 'none' }} onClick={() => toggleCard('cashbook')}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                <span className="text-secondary">Net Cashbook</span>
                <Users color="var(--neon-purple)" />
            </div>
            <h3>₹0</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p className="text-secondary" style={{fontSize: '0.85rem'}}>All ledgers clear</p>
                {activeCard === 'cashbook' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {activeCard === 'cashbook' && (
                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease'}}>
                    <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>Biggest Debtor:</p>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>No pending balances.</p>
                    <Link to="/cashbook" className="text-gradient" style={{display: 'inline-block', marginTop: '0.5rem', fontSize: '0.85rem'}}>Open Ledger ➔</Link>
                </div>
            )}
        </div>


      </div>

      <div className="glass-card">
         <h3 style={{marginBottom: '1rem'}}>Recent Platform Activity</h3>
         <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
             <div style={{padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between'}}>
                 <span className="text-secondary">No recent activity logged. Start billing to generate history!</span>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
