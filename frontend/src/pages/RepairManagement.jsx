import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Plus, Phone, Send, User, CheckCircle } from 'lucide-react';

const RepairManagement = () => {
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [transferringJobId, setTransferringJobId] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  
  const [formData, setFormData] = useState({
      customerName: '', customerPhone: '', deviceModel: '', issue: '', workerId: ''
  });

  const isWorker = user?.role === 'worker';

  const fetchJobs = async () => {
      try {
          const res = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/repairs`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(res.ok) setJobs(await res.json());
      } catch (err) { console.error(err); }
  };

  const fetchWorkers = async () => {
      try {
          const res = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/workers`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if(res.ok) setWorkers(await res.json());
      } catch (err) { console.error(err); }
  };

  useEffect(() => {
      fetchJobs();
      fetchWorkers();
  }, [token]);

  const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
          const res = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/repairs`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(formData)
          });
          if(res.ok) {
              alert('Repair Job Added!');
              setShowModal(false);
              setFormData({ customerName: '', customerPhone: '', deviceModel: '', issue: '', workerId: '' });
              fetchJobs();
          } else {
              const errData = await res.json();
              alert(errData.message || 'Failed to create job');
          }
      } catch (err) { console.error(err); }
      setLoading(false);
  };

  const updateJob = async (id, updates) => {
      try {
          const res = await fetch(`\${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/repairs/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(updates)
          });
          if(res.ok) fetchJobs();
      } catch (err) { console.error(err); }
  };

  const getStatusColor = (status) => {
      switch(status) {
          case 'Collected': return 'var(--text-secondary)';
          case 'Assigned': return 'var(--neon-purple)';
          case 'In Repair': return 'var(--neon-blue)';
          case 'Ready': return 'var(--ok-green)';
          case 'Completed': return 'var(--text-secondary)';
          default: return 'white';
      }
  };

  const sendWhatsAppUpdate = (job) => {
      let text = '';
      if(job.status === 'Collected') {
          text = `Hello ${job.customerName}, your device ${job.deviceModel} has been collected for repair. We will update you shortly.`;
      } else if (job.status === 'Ready') {
          text = `Hello ${job.customerName}, your device ${job.deviceModel} is ready! Total cost is ₹${job.costing || 0}. Please pick it up safely.`;
      } else {
          text = `Hello ${job.customerName}, an update on your device ${job.deviceModel}: the status is now ${job.status}.`;
      }
      
      const url = `https://wa.me/91${job.customerPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={28} /> Device Repairs (Live)
            </h2>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> New Repair Job
            </button>
        </div>

        {showModal && (
            <div className="modal-overlay" style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex: 1000, display:'flex', justifyContent:'center', alignItems:'center'}}>
                <div className="glass-card" style={{ width: '400px', position: 'relative' }}>
                    <button onClick={() => setShowModal(false)} style={{position: 'absolute', top: '10px', right: '15px', background:'none', border:'none', color:'white', fontSize:'1.5rem', cursor:'pointer'}}>&times;</button>
                    <h3>Add New Repair</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                        <input className="neon-input" required type="text" placeholder="Customer Name" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                        <input className="neon-input" required type="text" placeholder="Customer Phone" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                        <input className="neon-input" required type="text" placeholder="Device Model" value={formData.deviceModel} onChange={e => setFormData({...formData, deviceModel: e.target.value})} />
                        <input className="neon-input" required type="text" placeholder="Issue Description" value={formData.issue} onChange={e => setFormData({...formData, issue: e.target.value})} />
                        <select className="neon-input" style={{background: 'rgba(0,0,0,0.5)'}} value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}>
                            <option value="">-- Unassigned --</option>
                            {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                        </select>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Add Job'}</button>
                    </form>
                </div>
            </div>
        )}

        {viewingJob && (
            <div className="modal-overlay" style={{position: 'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.9)', zIndex: 1000, display:'flex', justifyContent:'center', alignItems:'center'}}>
                <div className="glass-card" style={{ width: '600px', maxWidth: '90%', position: 'relative', padding: '2rem' }}>
                    <button onClick={() => setViewingJob(null)} style={{position: 'absolute', top: '15px', right: '20px', background:'none', border:'none', color:'white', fontSize:'2rem', cursor:'pointer'}}>&times;</button>
                    
                    <h2 className="text-gradient" style={{ marginBottom: '1.5rem' }}>Job Details: {viewingJob.deviceModel}</h2>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Customer Name</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{viewingJob.customerName}</p>
                        </div>
                        <div>
                            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Customer Phone</p>
                            <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{viewingJob.customerPhone}</p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Issue Description</p>
                            <div className="glass-card" style={{ padding: '1rem', marginTop: '0.5rem', background: 'rgba(255,255,255,0.05)' }}>
                                {viewingJob.issue}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label className="text-secondary" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Update Status</label>
                            <select 
                                value={viewingJob.status} 
                                onChange={e => {
                                    updateJob(viewingJob._id, { status: e.target.value });
                                    setViewingJob({...viewingJob, status: e.target.value});
                                }}
                                className="neon-input"
                                style={{ background: 'rgba(0,0,0,0.5)', width: '100%', borderColor: getStatusColor(viewingJob.status), color: getStatusColor(viewingJob.status), fontWeight: 'bold' }}
                            >
                                <option value="Collected">Collected</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Repair">In Repair</option>
                                <option value="Ready">Ready</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="text-secondary" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>Final Costing (₹)</label>
                            <input 
                                type="number" 
                                className="neon-input"
                                value={viewingJob.costing || 0} 
                                onChange={(e) => setViewingJob({...viewingJob, costing: Number(e.target.value)})}
                                onBlur={(e) => updateJob(viewingJob._id, { costing: Number(e.target.value) })}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {viewingJob.status !== 'Completed' && (
                        <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', marginTop: '1.5rem', background: 'var(--ok-green)', color: 'white', border: 'none', fontWeight: 'bold' }}
                            onClick={() => {
                                updateJob(viewingJob._id, { status: 'Completed', costing: viewingJob.costing });
                                setViewingJob({...viewingJob, status: 'Completed'});
                                setTransferringJobId(null);
                            }}
                        >
                            <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px' }} />
                            Mark Task as Complete
                        </button>
                    )}
                </div>
            </div>
        )}

        <div className="glass-card" style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '1rem' }}>Device & Issue</th>
                        <th style={{ padding: '1rem' }}>Customer</th>
                        <th style={{ padding: '1rem' }}>Assigned To</th>
                        <th style={{ padding: '1rem' }}>Costing</th>
                        <th style={{ padding: '1rem' }}>Status</th>
                        <th style={{ padding: '1rem' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active repair jobs</td></tr>
                    ) : (
                        jobs.map(job => (
                            <tr key={job._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 'bold' }}>{job.deviceModel}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{job.issue}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div>{job.customerName}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Phone size={12}/> {job.customerPhone}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {!isWorker ? (
                                        <select 
                                            value={job.workerId?._id || ''} 
                                            onChange={e => updateJob(job._id, { workerId: e.target.value })}
                                            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', padding: '4px', borderRadius: '4px' }}
                                        >
                                            <option value="">Unassigned</option>
                                            {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                        </select>
                                    ) : (
                                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                            {transferringJobId === job._id ? (
                                                <select 
                                                    value={job.workerId?._id || ''} 
                                                    onChange={e => {
                                                        updateJob(job._id, { workerId: e.target.value });
                                                        setTransferringJobId(null);
                                                    }}
                                                    style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', padding: '4px', borderRadius: '4px' }}
                                                    autoFocus
                                                    onBlur={() => setTransferringJobId(null)}
                                                >
                                                    <option value="">-- Transfer To --</option>
                                                    {workers.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                                </select>
                                            ) : (
                                                <>
                                                    <span style={{color: 'var(--text-secondary)'}}>{job.workerId?.name || 'Unassigned'}</span>
                                                    {!job.workerId ? (
                                                        <button onClick={() => {
                                                            const activeJobs = jobs.filter(j => j.workerId?._id === user._id && !['Ready', 'Completed'].includes(j.status));
                                                            if (activeJobs.length > 0) {
                                                                alert('Please complete your current active job before accepting a new one!');
                                                                return;
                                                            }
                                                            updateJob(job._id, { workerId: user._id });
                                                        }} className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.4)' }}>
                                                            Accept Job
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => setViewingJob(job)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--neon-blue)', color: 'var(--neon-blue)', marginRight: '4px' }}>
                                                                Open Task
                                                            </button>
                                                            <button onClick={() => setTransferringJobId(job._id)} className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)' }}>
                                                                Transfer
                                                            </button>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <input 
                                        type="number" 
                                        value={job.costing || 0} 
                                        onChange={(e) => updateJob(job._id, { costing: Number(e.target.value) })}
                                        style={{ width: '80px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', color: 'white', padding: '4px', borderRadius: '4px' }}
                                        onBlur={(e) => updateJob(job._id, { costing: Number(e.target.value) })}
                                    />
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <select 
                                        value={job.status} 
                                        onChange={e => updateJob(job._id, { status: e.target.value })}
                                        style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${getStatusColor(job.status)}`, color: getStatusColor(job.status), padding: '4px', borderRadius: '4px', fontWeight: 'bold' }}
                                    >
                                        <option value="Collected">Collected</option>
                                        <option value="Assigned">Assigned</option>
                                        <option value="In Repair">In Repair</option>
                                        <option value="Ready">Ready</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <button onClick={() => sendWhatsAppUpdate(job)} className="btn btn-secondary" style={{ padding: '0.4rem', border: '1px solid rgba(0, 255, 136, 0.4)', color: 'var(--ok-green)', background: 'rgba(0,255,136,0.05)' }} title="Send WhatsApp Update">
                                        <Send size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};
export default RepairManagement;
