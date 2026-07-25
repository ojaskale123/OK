import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Users, Trash2, ShieldCheck, CheckCircle, XCircle } from 'lucide-react';
import { formatTime12 } from '../utils/formatTime';

const API = () => import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com';

const WorkerManagement = () => {
  const { token, user } = useAuth();
    const plan = (user?.subscription?.plan || 'basic').toString().toLowerCase();
  const [workers, setWorkers] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [pendingLogins, setPendingLogins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const fetchPendingLogins = async () => {
      if (!token || user?.role === 'worker') return;
      try {
          const res = await fetch(`${API()}/api/login-approval/pending`, {
              headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) setPendingLogins(await res.json());
      } catch (err) {
          console.error(err);
      }
  };

  const fetchWorkers = async () => {
      try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/workers`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(res.ok) setWorkers(await res.json());

          const attRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/attendance?limit=200`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (attRes.ok) {
              const attData = await attRes.json();
              setAttendanceLogs(Array.isArray(attData) ? attData : attData.items || []);
          }
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
      fetchWorkers();
      fetchPendingLogins();
      const interval = setInterval(fetchPendingLogins, 5000);
      return () => clearInterval(interval);
  }, [token, user?.role]);

  const handleLoginApproval = async (requestId, action) => {
      try {
          const res = await fetch(`${API()}/api/login-approval/${requestId}/${action}`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
              fetchPendingLogins();
          } else {
              alert(data.message || `Failed to ${action} login`);
          }
      } catch (e) {
          console.error(e);
      }
  };



  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/workers`, {
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

  const deleteWorker = async (id) => {
      if (!window.confirm("Are you sure you want to delete this worker account?")) return;
      try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/workers/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              fetchWorkers();
          } else {
              const err = await res.json();
              alert(err.message || 'Failed to delete worker');
          }
      } catch (e) { console.error(e); }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={28} /> Workers & Attendance
            </h2>
        </div>

        {pendingLogins.length > 0 && (
            <div className="glass-card" style={{ marginBottom: '2rem', borderColor: 'var(--neon-blue)' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={22} color="var(--neon-blue)" /> Worker login requests
                </h3>
                <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                    Approve once — worker can log in freely for 5 minutes. After that, they need approval again.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pendingLogins.map((req) => (
                        <div
                            key={req._id}
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '1rem',
                                background: 'rgba(0, 240, 255, 0.06)',
                                borderRadius: '8px',
                                border: '1px solid rgba(0, 240, 255, 0.2)',
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 600 }}>{req.workerName}</div>
                                <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{req.workerEmail}</div>
                                <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                    Requested {formatTime12(req.requestedAt)}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                                    onClick={() => handleLoginApproval(req._id, 'approve')}
                                >
                                    <CheckCircle size={16} /> Approve
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem', color: 'var(--ok-red)', borderColor: 'var(--ok-red)' }}
                                    onClick={() => handleLoginApproval(req._id, 'deny')}
                                >
                                    <XCircle size={16} /> Deny
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {/* Create Worker Form */}
                        <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserPlus size={20} color="var(--neon-blue)" /> Add New Worker
                </h3>
                                {plan === 'basic' ? (
                                    <div style={{ padding: '1rem' }}>
                                        <p className="text-secondary">Your current plan does not allow adding worker accounts. Upgrade to Standard or Pro to enable this feature.</p>
                                        <button className="btn btn-primary" onClick={() => window.location.href = '/plans'}>Upgrade Plan</button>
                                    </div>
                                ) : (
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
                )}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--neon-blue)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.7rem' }}>
                                        Active
                                    </div>
                                    <button onClick={() => deleteWorker(worker._id)} className="btn btn-secondary" style={{ padding: '0.3rem', border: '1px solid rgba(255, 60, 60, 0.4)', color: 'var(--ok-red)', background: 'rgba(255,60,60,0.05)' }} title="Delete Worker">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Attendance Logs */}
            <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Attendance Log</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '1rem 0' }}>Date</th>
                                <th>Worker</th>
                                <th>Check In</th>
                                <th>Check Out</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceLogs.length === 0 ? (
                                <tr><td colSpan="5" className="text-secondary" style={{ padding: '2rem 0', textAlign: 'center' }}>No attendance records yet.</td></tr>
                            ) : attendanceLogs.map(log => (
                                <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '1rem 0' }}>{log.date}</td>
                                    <td>{log.workerId?.name}</td>
                                    <td className="amount-receive">{formatTime12(log.checkInTime)}</td>
                                    <td className="amount-give">{formatTime12(log.checkOutTime)}</td>
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
