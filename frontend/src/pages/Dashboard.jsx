import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Package, Users, Wallet, Crown, ChevronDown, ChevronUp, MapPin, Compass, AlertTriangle } from 'lucide-react';
import { apiFetch, authHeaders } from '../utils/api';

const Dashboard = () => {
  const { user, token, updateUser } = useAuth();
  const [activeCard, setActiveCard] = useState(null);
  const [shopNameInput, setShopNameInput] = useState(user?.shopName || 'Frndz Telecom');
  const [updatingShopName, setUpdatingShopName] = useState(false);
  const [shopNameSuccess, setShopNameSuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [simulatedWorkers, setSimulatedWorkers] = useState([
      { _id: 'sim1', name: 'Ramesh Kumar', distance: 28, angle: 45, clockedIn: true },
      { _id: 'sim2', name: 'Ojas Kale', distance: 45, angle: 120, clockedIn: true },
      { _id: 'sim3', name: 'Priya Singh', distance: null, angle: 0, clockedIn: false }
  ]);
  const [stats, setStats] = useState({
      todaySales: 0,
      lowStockItemsCount: 0,
      criticalItems: [],
      netCashbook: 0,
      recentActivity: [],
      workers: [],
      shopLocation: null
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  React.useEffect(() => {
    if (user?.shopName) {
      setShopNameInput(user.shopName);
    }
  }, [user]);

  const handleSaveShopName = async () => {
    if (!shopNameInput.trim()) return alert("Shop name cannot be empty");
    setUpdatingShopName(true);
    setShopNameSuccess(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/auth/update-shop-name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shopName: shopNameInput.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({ shopName: data.shopName });
        setShopNameSuccess(true);
        setTimeout(() => setShopNameSuccess(false), 3000);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to update shop name");
      }
    } catch (e) {
      console.error(e);
      alert("Server error. Please try again.");
    } finally {
      setUpdatingShopName(false);
    }
  };

  React.useEffect(() => {
      if (!token || !user) return;

      const fetchStats = async () => {
          if (!user.subscription?.isActive || user.subscription?.plan === 'None') {
             setLoading(false);
             setLoadError(null);
             return;
          }
          setLoading(true);
          setLoadError(null);
          try {
              const res = await apiFetch('/api/dashboard/stats', {
                  headers: authHeaders(token),
              });
              const data = await res.json();
              if (res.ok) {
                setStats(data);
              } else {
                setLoadError(data.message || 'Could not load dashboard data.');
              }
          } catch(e) {
              console.error("Failed to load stats", e);
              setLoadError('Server unreachable. Wait a moment and refresh the page.');
          } finally {
              setLoading(false);
          }
      };
      
      fetchStats();
  }, [token, user]);
  
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

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  React.useEffect(() => {
    let interval;
    if (demoMode) {
      interval = setInterval(() => {
        setSimulatedWorkers(prev => prev.map(w => {
          if (w._id === 'sim1') {
            return {
              ...w,
              angle: (w.angle + 8) % 360,
              distance: Math.round(25 + Math.sin(w.angle * Math.PI / 180) * 8)
            };
          }
          if (w._id === 'sim2') {
            const nextDist = w.distance >= 125 ? 25 : w.distance + 8;
            return {
              ...w,
              angle: (w.angle + 4) % 360,
              distance: nextDist
            };
          }
          return w;
        }));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [demoMode]);

  const displayWorkers = demoMode ? simulatedWorkers : (stats.workers || []).map(w => {
      const hasLocation = w.lastKnownLocation && w.lastKnownLocation.lat && w.lastKnownLocation.lng;
      
      let distance = null;
      let angle = 0;
      
      if (hasLocation && stats.shopLocation && stats.shopLocation.lat && stats.shopLocation.lng) {
          distance = getDistance(
              w.lastKnownLocation.lat, 
              w.lastKnownLocation.lng, 
              stats.shopLocation.lat, 
              stats.shopLocation.lng
          );
          
          const dy = (w.lastKnownLocation.lat - stats.shopLocation.lat) * 110574;
          const dx = (w.lastKnownLocation.lng - stats.shopLocation.lng) * 111320 * Math.cos(stats.shopLocation.lat * Math.PI / 180);
          angle = Math.atan2(dy, dx) * 180 / Math.PI;
      }
      
      return {
          _id: w._id,
          name: w.name,
          email: w.email,
          distance: distance !== null ? Math.round(distance) : null,
          angle: angle,
          clockedIn: hasLocation
      };
  });

  const hasShopLocation = stats.shopLocation && stats.shopLocation.lat && stats.shopLocation.lng;
  const activeShopLocation = hasShopLocation ? stats.shopLocation : (demoMode ? { lat: 28.6139, lng: 77.2090 } : null);
  const anyWorkerOut = displayWorkers.some(w => w.distance !== null && w.distance > 100);

  return (
    <div className="animate-fade-in">
      <style>{`
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.3); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes alarm-flash {
          0%, 100% { border-color: rgba(196, 132, 122, 0.4); background: rgba(196, 132, 122, 0.08); }
          50% { border-color: rgba(196, 132, 122, 0.8); background: rgba(196, 132, 122, 0.2); }
        }
      `}</style>
      {loadError && (
        <div className="glass-card" style={{ borderColor: 'var(--ok-red)', marginBottom: '1.5rem', padding: '1rem' }}>
          <p style={{ color: 'var(--ok-red)', margin: 0 }}>{loadError}</p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="text-gradient">Business Overview</h2>
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1rem' }}>
            <div><span style={{color: 'var(--ok-green)'}}>Plan:</span> {plan}</div>
        </div>
      </div>

      {anyWorkerOut && (
          <div className="glass-card" style={{ background: 'rgba(196, 132, 122, 0.12)', borderColor: 'rgba(196, 132, 122, 0.45)', marginBottom: '1.5rem', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 0 15px rgba(196,132,122,0.1)' }}>
              <AlertTriangle color="var(--ok-red)" size={20} />
              <p style={{ color: 'var(--ok-red)', margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Geofence Alarm: A staff member has moved outside the 100-meter shop boundary limit!
              </p>
          </div>
      )}

      {shopNameSuccess && (
          <div className="glass-card" style={{ borderColor: 'var(--ok-green)', marginBottom: '1.5rem', padding: '0.75rem 1rem' }}>
              <p style={{ color: 'var(--ok-green)', margin: 0 }}>Shop name updated successfully! 🎉</p>
          </div>
      )}

      {user?.role !== 'worker' && (
          <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>Shop Name</h4>
                  <p className="text-secondary" style={{ margin: 0, fontSize: '0.85rem' }}>Set the name that appears at the top of generated invoices & receipts.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
                  <input
                      type="text"
                      className="form-input"
                      style={{ margin: 0 }}
                      placeholder="Enter Shop Name (e.g. Frndz Telecom)"
                      value={shopNameInput}
                      onChange={(e) => setShopNameInput(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={handleSaveShopName} disabled={updatingShopName}>
                      {updatingShopName ? 'Saving...' : 'Save Name'}
                  </button>
              </div>
          </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Sales Card */}
        <div className="glass-card" style={{ cursor: 'pointer', outline: activeCard === 'sales' ? '2px solid var(--neon-blue)' : 'none' }} onClick={() => toggleCard('sales')}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                <span className="text-secondary">Today's Sales</span>
                <TrendingUp color="var(--neon-blue)" />
            </div>
            <h3>{loading ? '...' : `₹${stats.todaySales.toLocaleString()}`}</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p className="text-secondary" style={{fontSize: '0.85rem'}}>Live Revenue Pipeline</p>
                {activeCard === 'sales' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {activeCard === 'sales' && (
                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease'}}>
                    <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>Recent Completed Sales:</p>
                    <ul style={{listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: '0'}}>
                        {stats.recentActivity.length > 0 ? stats.recentActivity.map((r, i) => (
                             <li key={i} style={{marginBottom: '4px'}}>• {r.desc} - <span className="text-gradient">₹{r.amount}</span></li>
                        )) : (
                             <li>No sales recorded today yet.</li>
                        )}
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
            <h3 style={{color: stats.lowStockItemsCount > 0 ? 'var(--ok-red)' : '#fff'}}>{loading ? '...' : stats.lowStockItemsCount}</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p className="text-secondary" style={{fontSize: '0.85rem'}}>{stats.lowStockItemsCount > 0 ? 'Requires action' : 'All stock optimal'}</p>
                {activeCard === 'stock' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {activeCard === 'stock' && (
                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease'}}>
                    <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>Critically Low:</p>
                    <ul style={{listStyle: 'none', fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: '0'}}>
                        {stats.criticalItems.length > 0 ? stats.criticalItems.map((c, i) => (
                             <li key={i} style={{marginBottom: '4px'}}>• {c.name} (<span style={{color: 'var(--ok-red)'}}>{c.stock} left</span>)</li>
                        )) : (
                             <li>Inventory is perfectly stocked.</li>
                        )}
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
            <h3 style={{color: stats.netCashbook > 0 ? 'var(--ok-green)' : stats.netCashbook < 0 ? 'var(--ok-red)' : '#fff'}}>{loading ? '...' : `₹${stats.netCashbook.toLocaleString()}`}</h3>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <p className="text-secondary" style={{fontSize: '0.85rem'}}>
                   {stats.netCashbook === 0 ? 'All ledgers clear' : stats.netCashbook > 0 ? 'Owed to you overall' : 'You owe overall'}
                </p>
                {activeCard === 'cashbook' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {activeCard === 'cashbook' && (
                <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease'}}>
                    <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.5rem'}}>Ledger Status:</p>
                    <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                        {stats.netCashbook === 0 ? 'No pending balances.' : 'You have pending settlements.'}
                    </p>
                    <Link to="/cashbook" className="text-gradient" style={{display: 'inline-block', marginTop: '0.5rem', fontSize: '0.85rem'}}>Open Ledger ➔</Link>
                </div>
            )}
        </div>


      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {/* Radar Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Compass color="var(--ok-green)" size={20} style={{ animation: 'radar-sweep 8s linear infinite' }} />
                      Geofence Radar Scanner
                  </h3>
                  <button 
                      className="btn" 
                      style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.25rem 0.55rem',
                          background: demoMode ? 'rgba(212, 184, 122, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: demoMode ? '1px solid rgba(212, 184, 122, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: demoMode ? '#b98bf6' : '#fff',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s'
                      }}
                      onClick={() => setDemoMode(!demoMode)}
                  >
                      {demoMode ? '🛑 Stop Demo' : '⚡ GPS Simulator'}
                  </button>
              </div>

              {activeShopLocation ? (
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: '0.5rem' }}>
                      {/* Radar circular sweep panel */}
                      <div style={{ 
                          position: 'relative', 
                          width: '180px', 
                          height: '180px', 
                          background: 'rgba(0,0,0,0.4)', 
                          borderRadius: '50%', 
                          border: anyWorkerOut ? '2px solid rgba(196, 132, 122, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          overflow: 'hidden',
                          boxShadow: anyWorkerOut ? '0 0 20px rgba(196, 132, 122, 0.15) inset' : 'none',
                          animation: anyWorkerOut ? 'alarm-flash 1.5s infinite' : 'none'
                      }}>
                          {/* Concentric rings */}
                          <div style={{ position: 'absolute', inset: '10px', border: '1px dashed rgba(127, 168, 146, 0.05)', borderRadius: '50%' }}></div>
                          <div style={{ position: 'absolute', inset: '30px', border: '1px dashed rgba(127, 168, 146, 0.08)', borderRadius: '50%' }}></div>
                          <div style={{ position: 'absolute', inset: '60px', border: '1px dashed rgba(127, 168, 146, 0.12)', borderRadius: '50%' }}></div>
                          
                          {/* sweep ray */}
                          <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'conic-gradient(from 0deg, rgba(127, 168, 146, 0.12) 0deg, transparent 90deg, transparent 360deg)',
                              animation: 'radar-sweep 4s linear infinite',
                              pointerEvents: 'none',
                              borderRadius: '50%',
                              transformOrigin: 'center'
                          }} />

                          {/* Center Shop Anchor */}
                          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '8px', height: '8px', background: 'var(--neon-blue)', borderRadius: '50%', zIndex: 10, boxShadow: '0 0 10px var(--neon-blue)' }}>
                              <div style={{ position: 'absolute', inset: '-12px', border: '2px solid var(--neon-blue)', borderRadius: '50%', animation: 'radar-pulse 2s infinite' }}></div>
                          </div>

                          {/* Plotted Worker Dots */}
                          {displayWorkers.filter(w => w.distance !== null).map(w => {
                              const isOut = w.distance > 100;
                              const visualDist = isOut ? 85 : Math.max(10, w.distance * 0.85); // scaled to fit 90px radius
                              const rad = (w.angle * Math.PI) / 180;
                              const x = Math.cos(rad) * visualDist;
                              const y = -Math.sin(rad) * visualDist;

                              return (
                                  <div 
                                      key={w._id}
                                      style={{
                                          position: 'absolute',
                                          left: `calc(50% + ${x}px - 6px)`,
                                          top: `calc(50% + ${y}px - 6px)`,
                                          width: '12px',
                                          height: '12px',
                                          borderRadius: '50%',
                                          background: isOut ? 'var(--ok-red)' : 'var(--ok-green)',
                                          border: '2px solid #fff',
                                          boxShadow: `0 0 8px ${isOut ? 'var(--ok-red)' : 'var(--ok-green)'}`,
                                          zIndex: 20,
                                          cursor: 'pointer',
                                          transition: 'all 0.5s ease-out'
                                      }}
                                      title={`${w.name}: ${w.distance}m`}
                                  >
                                      {isOut && (
                                          <div style={{ position: 'absolute', inset: '-6px', border: '1.5px solid var(--ok-red)', borderRadius: '50%', animation: 'radar-pulse 1.2s infinite' }}></div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>

                      {/* Workers status list */}
                      <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Staff Geolocation
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                              {displayWorkers.length === 0 ? (
                                  <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>No workers added to this shop.</p>
                              ) : displayWorkers.map(w => {
                                  const isOut = w.distance > 100;
                                  return (
                                      <div key={w._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.4rem 0.65rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                                              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#fff' }}>{w.name}</span>
                                              <span className="text-secondary" style={{ fontSize: '0.68rem' }}>
                                                  {w.distance !== null ? `${w.distance}m away` : 'No GPS check-in'}
                                              </span>
                                          </div>
                                          <div>
                                              {w.distance === null ? (
                                                  <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>Offline</span>
                                              ) : isOut ? (
                                                  <span style={{ fontSize: '0.65rem', background: 'rgba(196, 132, 122, 0.15)', color: 'var(--ok-red)', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid rgba(196, 132, 122, 0.3)' }}>Out of Fence</span>
                                              ) : (
                                                  <span style={{ fontSize: '0.65rem', background: 'rgba(127, 168, 146, 0.15)', color: 'var(--ok-green)', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid rgba(127, 168, 146, 0.3)' }}>Inside</span>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '1.5rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', marginTop: '0.5rem' }}>
                      <MapPin size={28} color="var(--ok-red)" style={{ marginBottom: '0.5rem' }} />
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>Shop Location Not Set</h4>
                      <p className="text-secondary" style={{ fontSize: '0.78rem', maxWidth: '280px', margin: 0 }}>
                          Configure your shop location in the <Link to="/attendance" style={{ color: 'var(--neon-blue)', fontWeight: 'bold' }}>Attendance Tab</Link> to enable live GPS tracking.
                      </p>
                  </div>
              )}
          </div>

          {/* Recent Platform Activity */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Recent Platform Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {stats.recentActivity.length > 0 ? stats.recentActivity.map((r, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderLeft: '3px solid var(--neon-blue)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span>{r.desc} <span className="text-gradient" style={{ fontWeight: 'bold', marginLeft: '8px' }}>₹{r.amount}</span></span>
                          <span className="text-secondary" style={{ fontSize: '0.75rem' }}>{new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                  )) : (
                      <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span className="text-secondary">No recent activity logged. Start billing to generate history!</span>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
