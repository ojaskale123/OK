import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Settings, Clock, MapPin, Receipt, Camera, Upload, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = () => import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com';

const Profile = () => {
    const { user, logout, updateUser, token } = useAuth();
    const navigate = useNavigate();
    const [gstForm, setGstForm] = useState({
        enabled: false,
        gstin: '',
        state: '',
        invoicePrefix: 'INV',
    });
    const [gstMsg, setGstMsg] = useState('');
    const [gstSaving, setGstSaving] = useState(false);
    const [branding, setBranding] = useState({
        logoUrl: '',
        instaQrUrl: '',
        googleQrUrl: ''
    });
    const [brandingMsg, setBrandingMsg] = useState('');
    const [brandingSaving, setBrandingSaving] = useState(false);

    useEffect(() => {
        const gs = user?.gstSettings;
        if (gs) {
            setGstForm({
                enabled: Boolean(gs.enabled),
                gstin: gs.gstin || '',
                state: gs.state || '',
                invoicePrefix: gs.invoicePrefix || 'INV',
            });
        }

        if (user) {
            setBranding({
                logoUrl: user.logoUrl || '',
                instaQrUrl: user.instaQrUrl || '',
                googleQrUrl: user.googleQrUrl || ''
            });
        }

        if (gs) return;
        if (!token) return;
        fetch(`${API()}/api/auth/gst-settings`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.gstSettings) {
                    setGstForm({
                        enabled: Boolean(data.gstSettings.enabled),
                        gstin: data.gstSettings.gstin || '',
                        state: data.gstSettings.state || '',
                        invoicePrefix: data.gstSettings.invoicePrefix || 'INV',
                    });
                }
            })
            .catch(() => {});
    }, [user, token]);

    const saveGstSettings = async () => {
        setGstSaving(true);
        setGstMsg('');
        try {
            const res = await fetch(`${API()}/api/auth/gst-settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(gstForm),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            updateUser({ gstSettings: data.gstSettings });
            setGstMsg('GST settings saved.');
        } catch (e) {
            setGstMsg(e.message || 'Save failed');
        } finally {
            setGstSaving(false);
            setTimeout(() => setGstMsg(''), 4000);
        }
    };

    const saveBrandingData = async (overrides = {}) => {
        const logoToSave = overrides.logoUrl !== undefined ? overrides.logoUrl : branding.logoUrl;
        const instaQrToSave = overrides.instaQrUrl !== undefined ? overrides.instaQrUrl : branding.instaQrUrl;
        const googleQrToSave = overrides.googleQrUrl !== undefined ? overrides.googleQrUrl : branding.googleQrUrl;

        setBrandingSaving(true);
        setBrandingMsg('');
        try {
            if (!token) throw new Error('Not authenticated.');
            const payload = {
                logoUrl: logoToSave || '',
                instaQrUrl: instaQrToSave || '',
                googleQrUrl: googleQrToSave || ''
            };
            const res = await fetch(`${API()}/api/auth/shop-details`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Save failed');
            updateUser(data);
            setBrandingMsg('✓ Profile & QR images saved! Automatically shown on Job Sheets.');
        } catch (e) {
            console.error(e);
            setBrandingMsg(e.message || 'Save failed.');
        } finally {
            setBrandingSaving(false);
        }
    };

    const handleProfileImageUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const imgDataUrl = reader.result;
                setBranding((prev) => ({ ...prev, logoUrl: imgDataUrl }));
                saveBrandingData({ logoUrl: imgDataUrl });
            }
        };
        reader.onerror = () => {
            setBrandingMsg('Failed to read the logo image file.');
        };
        reader.readAsDataURL(file);
    };

    const handleInstaQrUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const imgDataUrl = reader.result;
                setBranding((prev) => ({ ...prev, instaQrUrl: imgDataUrl }));
                saveBrandingData({ instaQrUrl: imgDataUrl });
            }
        };
        reader.onerror = () => {
            setBrandingMsg('Failed to read Instagram QR image file.');
        };
        reader.readAsDataURL(file);
    };

    const handleGoogleQrUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const imgDataUrl = reader.result;
                setBranding((prev) => ({ ...prev, googleQrUrl: imgDataUrl }));
                saveBrandingData({ googleQrUrl: imgDataUrl });
            }
        };
        reader.onerror = () => {
            setBrandingMsg('Failed to read Google QR image file.');
        };
        reader.readAsDataURL(file);
    };

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
            <div style={{ flex: '1 1 300px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                    {/* Profile Image with Camera Upload Button */}
                    <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.25rem' }}>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            background: 'var(--accent-gradient)',
                            border: '3px solid var(--primary-color, #3b82f6)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                            margin: '0 auto'
                        }}>
                            {(branding.logoUrl || user?.logoUrl) ? (
                                <img src={branding.logoUrl || user?.logoUrl} alt="Profile / Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                (user?.name?.charAt(0) || 'U')
                            )}
                        </div>
                        <label
                            htmlFor="profile-image-input"
                            style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                background: '#2563eb',
                                color: '#ffffff',
                                borderRadius: '50%',
                                width: '34px',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                                border: '2px solid #ffffff',
                                transition: 'transform 0.2s ease'
                            }}
                            title="Set Profile Image & Job Sheet Logo"
                        >
                            <Camera size={18} />
                        </label>
                        <input
                            id="profile-image-input"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleProfileImageUpload}
                        />
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                        <label htmlFor="profile-image-input" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.9rem', cursor: 'pointer', borderRadius: '20px' }}>
                            <Upload size={14} /> Upload Profile Image
                        </label>
                    </div>

                    <div style={{ margin: '0.25rem auto 1.25rem', padding: '0.4rem 0.8rem', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: '12px', fontSize: '0.8rem', color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>⚡ Automatically set as Job Sheet Logo</span>
                    </div>

                    <h2>{user?.name || 'Loading...'}</h2>
                    <p className="text-secondary">{user?.email}</p>
                    <div style={{ marginTop: '1.25rem', display: 'inline-block', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                        Plan: <span className="text-gradient" style={{fontSize: '1rem'}}>{user?.subscription?.plan || 'None'}</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Valid until: <strong>{user?.subscription?.validUntil ? new Date(user.subscription.validUntil).toLocaleDateString('en-IN') : 'N/A'}</strong>
                    </div>
                    <button onClick={() => navigate('/plans')} className="btn btn-primary" style={{ marginTop: '1.25rem', width: '100%', padding: '0.9rem' }}>
                        Manage / Upgrade Plan
                    </button>
                </div>

                    <div className="glass-card">
                        <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={20} className="text-secondary" /> Branding & Job Sheet Images
                        </h3>
                        <div style={{ display: 'grid', gap: '1.25rem' }}>
                            {/* 1. Profile / Shop Logo */}
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>🖼️ Profile / Shop Logo Image</span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                    Used as your profile avatar and shop logo on top of all Job Sheets & Receipts.
                                </p>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="form-input"
                                        onChange={handleProfileImageUpload}
                                    />
                                    <input
                                        className="form-input"
                                        value={branding.logoUrl}
                                        onChange={(e) => setBranding((prev) => ({ ...prev, logoUrl: e.target.value }))}
                                        placeholder="Or enter logo URL: https://.../logo.png"
                                    />
                                    {branding.logoUrl && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img src={branding.logoUrl} alt="Logo preview" style={{ width: '60px', height: '60px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#fff', padding: '2px' }} />
                                            <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>✓ Set as Job Sheet Logo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Instagram QR Code */}
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>📷 Instagram QR Code Image</span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                    Upload your Instagram QR image. Automatically displayed on Job Sheet footer.
                                </p>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="form-input"
                                        onChange={handleInstaQrUpload}
                                    />
                                    <input
                                        className="form-input"
                                        value={branding.instaQrUrl}
                                        onChange={(e) => setBranding((prev) => ({ ...prev, instaQrUrl: e.target.value }))}
                                        placeholder="Or enter Instagram QR URL: https://.../insta-qr.png"
                                    />
                                    {branding.instaQrUrl && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img src={branding.instaQrUrl} alt="Instagram QR preview" style={{ width: '60px', height: '60px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#fff', padding: '2px' }} />
                                            <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>✓ Shown on Job Sheet Footer (Instagram)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Google Review QR Code */}
                            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>⭐ Google Review QR Code Image</span>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                    Upload your Google Review QR image. Automatically displayed on Job Sheet footer.
                                </p>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="form-input"
                                        onChange={handleGoogleQrUpload}
                                    />
                                    <input
                                        className="form-input"
                                        value={branding.googleQrUrl}
                                        onChange={(e) => setBranding((prev) => ({ ...prev, googleQrUrl: e.target.value }))}
                                        placeholder="Or enter Google Review QR URL: https://.../google-qr.png"
                                    />
                                    {branding.googleQrUrl && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <img src={branding.googleQrUrl} alt="Google QR preview" style={{ width: '60px', height: '60px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#fff', padding: '2px' }} />
                                            <span style={{ fontSize: '0.8rem', color: '#60a5fa' }}>✓ Shown on Job Sheet Footer (Google Review)</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button className="btn btn-primary" onClick={() => saveBrandingData()} disabled={brandingSaving} style={{ padding: '0.85rem' }}>
                                {brandingSaving ? 'Saving…' : 'Save All Branding Images'}
                            </button>
                            {brandingMsg && <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: brandingMsg.includes('failed') ? '#b91c1c' : '#157b35', fontWeight: 600, textAlign: 'center' }}>{brandingMsg}</p>}
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

                {user?.role !== 'worker' && (
                    <div className="glass-card" style={{ marginTop: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Receipt size={20} className="text-secondary" /> GST Settings
                        </h3>
                        <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                            GST on each item is set in <strong>Inventory</strong> (Apply GST toggle). Here you set GSTIN for receipts and Excel export for your CA.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: 600 }}>Enable GST</span>
                            <input
                                type="checkbox"
                                checked={gstForm.enabled}
                                onChange={(e) => setGstForm({ ...gstForm, enabled: e.target.checked })}
                                style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">GSTIN (15 characters)</label>
                            <input
                                className="form-input"
                                placeholder="27AAAAA0000A1Z5"
                                value={gstForm.gstin}
                                onChange={(e) => setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })}
                                maxLength={15}
                                disabled={!gstForm.enabled}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">State (place of supply)</label>
                            <input
                                className="form-input"
                                placeholder="e.g. Maharashtra"
                                value={gstForm.state}
                                onChange={(e) => setGstForm({ ...gstForm, state: e.target.value })}
                                disabled={!gstForm.enabled}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Invoice prefix</label>
                            <input
                                className="form-input"
                                placeholder="INV"
                                value={gstForm.invoicePrefix}
                                onChange={(e) => setGstForm({ ...gstForm, invoicePrefix: e.target.value })}
                                disabled={!gstForm.enabled}
                            />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={saveGstSettings} disabled={gstSaving}>
                            {gstSaving ? 'Saving…' : 'Save GST Settings'}
                        </button>
                        {gstMsg && <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--ok-green)' }}>{gstMsg}</p>}
                    </div>
                )}

                {user?.role !== 'worker' && (
                    <div className="glass-card" style={{ marginTop: '1rem' }}>
                        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={20} className="text-secondary" /> Set Shop Location
                        </h3>
                        <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Clicking this button saves your current GPS location permanently to the database. Workers will only be able to clock-in if they are within 100 meters of this location. You can be logged out or sleeping, it will still work!
                        </p>
                        <button className="btn btn-primary" onClick={async (e) => {
                            const btn = e.target;
                            btn.innerHTML = 'Locating...';
                            btn.disabled = true;
                            navigator.geolocation.getCurrentPosition(async (pos) => {
                                try {
                                    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/auth/update-location`, {
                                        method: 'PUT',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                        },
                                        body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                                    });
                                    if(res.ok) {
                                        btn.innerHTML = '✓ Shop Location Saved Permanently!';
                                        btn.className = 'btn btn-green';
                                    } else {
                                        const errorData = await res.json().catch(() => ({}));
                                        btn.innerHTML = errorData.message || 'Error saving location';
                                    }
                                } catch(err) {
                                    console.error(err);
                                    btn.innerHTML = 'Network Error';
                                }
                                setTimeout(() => {
                                    btn.innerHTML = 'Update Shop Location';
                                    btn.className = 'btn btn-primary';
                                    btn.disabled = false;
                                }, 3000);
                            }, () => {
                                btn.innerHTML = 'GPS Permission Denied';
                                btn.disabled = false;
                            }, { enableHighAccuracy: true });
                        }} style={{ width: '100%', padding: '1rem' }}>
                            Update Shop Location
                        </button>
                    </div>
                )}
            </div>

            {/* Right Column: Details & History */}
            <div style={{ flex: '2 1 400px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
