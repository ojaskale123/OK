import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Settings, Bell, Shield, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const dummyHistory = [
        { action: 'Activated Retail Pro Trial', date: 'Just now' },
        { action: 'Earned 500 Gamification Credits', date: 'Just now' },
        { action: 'Logged in to system', date: '2 mins ago' },
        { action: 'Account Created', date: '3 mins ago' }
    ];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {/* Left Column: User Card & Settings */}
            <div style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem', fontWeight: 'bold' }}>
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <h2>{user?.name || 'Loading...'}</h2>
                    <p className="text-secondary">{user?.email}</p>
                    <div style={{ marginTop: '1.5rem', display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                        Plan: <span className="text-gradient" style={{fontSize: '1rem'}}>{user?.subscription?.plan || 'None'}</span>
                    </div>
                </div>

                <div className="glass-card">
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={20} className="text-secondary" /> Account Settings</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Email Notifications</span>
                            <input type="checkbox" defaultChecked style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Two-Factor Auth</span>
                            <input type="checkbox" style={{ cursor: 'pointer', transform: 'scale(1.2)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Dark Mode</span>
                            <input type="checkbox" defaultChecked disabled style={{ cursor: 'not-allowed', transform: 'scale(1.2)' }} />
                        </div>
                    </div>
                </div>

                <button className="btn btn-red" onClick={handleLogout} style={{ width: '100%', padding: '1rem' }}>
                    <LogOut size={20} /> Log Out of OK ERP
                </button>
            </div>

            {/* Right Column: Details & History */}
            <div style={{ flex: '2', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={20} className="text-secondary" /> Personal Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Full Name</span>
                            <p style={{ fontWeight: 500 }}>{user?.name}</p>
                        </div>
                        <div>
                            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Business Role</span>
                            <p style={{ fontWeight: 500 }}>{user?._id === 'master-admin-id' ? 'Master Developer' : 'Owner'}</p>
                        </div>
                        <div>
                            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Gamification Hub</span>
                            <p style={{ fontWeight: 500, color: '#fbbf24' }}>{user?.walletBalance || 0} Credits remaining</p>
                        </div>
                        <div>
                            <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Subscription Status</span>
                            <p style={{ fontWeight: 500, color: user?.subscription?.isActive ? 'var(--ok-green)' : 'var(--ok-red)' }}>
                                {user?.subscription?.isActive ? 'Active & Running' : 'Expired / Locked'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ flex: '1' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={20} className="text-secondary" /> Activity History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {dummyHistory.map((h, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: i !== dummyHistory.length -1 ? '1px solid var(--border-color)' : 'none' }}>
                                <span>{h.action}</span>
                                <span className="text-secondary">{h.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
