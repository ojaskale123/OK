import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Users } from 'lucide-react';

const WorkerManagement = () => {
  const { token } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const fetchWorkers = async () => {
      try {
          const res = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/workers`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(res.ok) setWorkers(await res.json());

          const attRes = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/attendance`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(attRes.ok) setAttendanceLogs(await attRes.json());
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
      fetchWorkers();
  }, [token]);

  const handleSetLocation = () => {
      if (!navigator.geolocation) return alert("Geolocation is not supported by your browser");
      setSettingLocation(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
          try {
              const res = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/attendance/shop-location`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude })
              });
              if(res.ok) alert("Shop GPS Location Locked Successfully!");
              else alert("Failed to lock location.");
          } catch(e) { console.error(e); }
          setSettingLocation(false);
      }, () => {
          alert("Unable to retrieve your location. Please allow location access.");
          setSettingLocation(false);
      });
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          const res = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/workers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(formData)
          });
          
          if(res.ok) {
              alert('Worker created successfully!');
              setFormData({ name: '', email: '', password: '' });
              fetchWorkers();
          } else {
              const errorData = await res.json();
              alert(errorData.message || 'Failed to create worker');
          }
      } catch (err) {
          console.error(err);
      }
      setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={28} /> Workers & Attendance
            </h2>
            <button className="btn btn-green" onClick={handleSetLocation} disabled={settingLocation}>
                {settingLocation ? 'Locking GPS...' : '📍 Lock Current GPS as Shop Location'}
            </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Create Worker Form */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserPlus size={20} color="var(--neon-blue)" /> Add New Worker
                </h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="text-secondary" style={{ fontSize: '0.8rem' }}>Full Name</label>
                        <input type="text" className="neon-input" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Worker Name" />
                    </div>
                    <div>
                        <label className="text-secondary" style={{ fontSize: '0.8rem' }}>Login Email</label>
                        <input type="email" className="neon-input" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="worker@shop.com" />
                    </div>
                    <div>
                        <label className="text-secondary" style={{ fontSize: '0.8rem' }}>Temporary Password</label>
                        <input type="password" className="neon-input" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="••••••" />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
                        {loading ? 'Creating...' : 'Create Worker Account'}
                    </button>
                </form>
            </div>

            {/* List Workers */}
            <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} color="var(--neon-purple)" /> Existing Staff
                </h3>
                {workers.length === 0 ? (
                    <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem' }}>No workers added yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {workers.map(worker => (
                            <div key={worker._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{worker.name}</div>
                                    <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{worker.email}</div>
                                </div>
                                <div style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--neon-blue)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem' }}>
                                    Active
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Attendance Logs */}
            <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>GPS Attendance Log</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '1rem 0' }}>Date</th>
                                <th>Worker</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                                <th>Distance Variance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceLogs.length === 0 ? (
                                <tr><td colSpan="5" className="text-secondary" style={{ padding: '2rem 0', textAlign: 'center' }}>No attendance records yet.</td></tr>
                            ) : attendanceLogs.map(log => (
                                <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem 0' }}>{log.date}</td>
                                    <td>{log.workerId?.name}</td>
                                    <td className="amount-receive">{log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '--'}</td>
                                    <td className="amount-give">{log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : '--'}</td>
                                    <td>{log.checkInLocation?.distanceFromShop ? `${Math.round(log.checkInLocation.distanceFromShop)}m` : 'Unknown'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
export default WorkerManagement;
