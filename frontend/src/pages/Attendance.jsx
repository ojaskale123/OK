import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Clock, CheckCircle } from 'lucide-react';

const Attendance = () => {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) setLogs(await res.json());
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchLogs(); }, [token]);

  const handleAction = (type) => {
    if (!navigator.geolocation) return setStatusMsg("GPS is not supported on your device");
    
    setLoading(true);
    setStatusMsg(`Acquiring GPS Signal...`);
    
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/attendance/${type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setStatusMsg(`Successfully ${type === 'check-in' ? 'Clocked In' : 'Clocked Out'}!`);
          fetchLogs();
        } else {
          setStatusMsg(`Error: ${data.message}`);
        }
      } catch (e) {
        setStatusMsg("Failed to connect to server");
      }
      setLoading(false);
    }, (error) => {
      setStatusMsg("Failed to get location. Please enable GPS permissions.");
      setLoading(false);
    }, { enableHighAccuracy: true });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Time & Attendance</h2>
        <p className="text-secondary">Your device must be at the shop location to clock in.</p>
      </div>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', marginBottom: '2rem' }}>
        <MapPin size={48} color="var(--neon-purple)" style={{ marginBottom: '1.5rem', animation: 'pulse 2s infinite' }} />
        
        {statusMsg && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: statusMsg.includes('Error') ? 'var(--ok-red)' : 'var(--neon-blue)' }}>
                {statusMsg}
            </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px' }}>
          <button className="btn btn-green" style={{ flex: 1, padding: '1rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleAction('check-in')} disabled={loading}>
            <CheckCircle /> Clock In
          </button>
          
          <button className="btn btn-secondary" style={{ flex: 1, padding: '1rem', fontSize: '1.2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 60, 60, 0.2)', color: 'var(--ok-red)', borderColor: 'var(--ok-red)' }} onClick={() => handleAction('check-out')} disabled={loading}>
            <Clock /> Clock Out
          </button>
        </div>
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem' }}>{user?.role !== 'worker' ? 'Team Attendance History' : 'My Attendance History'}</h3>
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '1rem 0' }}>Date</th>
                        {user?.role !== 'worker' && <th>Worker Name</th>}
                        <th>Check In</th>
                        <th>Check Out</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.length === 0 ? (
                        <tr><td colSpan={user?.role !== 'worker' ? "4" : "3"} className="text-secondary" style={{ padding: '2rem 0', textAlign: 'center' }}>No attendance records yet.</td></tr>
                    ) : logs.map(log => (
                        <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem 0' }}>{log.date}</td>
                            {user?.role !== 'worker' && <td>{log.workerId?.name || 'Unknown'}</td>}
                            <td className="amount-receive">{log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '--'}</td>
                            <td className="amount-give">{log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : '--'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
