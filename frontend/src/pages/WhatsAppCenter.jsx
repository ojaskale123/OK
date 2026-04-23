import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Phone } from 'lucide-react';

const WhatsAppCenter = () => {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [sentStatus, setSentStatus] = useState({});

  const fetchJobs = async () => {
      try {
          const res = await fetch('https://ok-ax2v.onrender.com/api/repairs', { headers: { 'Authorization': `Bearer ${token}` } });
          if(res.ok) setJobs(await res.json());
      } catch(e) { console.error(e); }
  };

  useEffect(() => {
      fetchJobs();
  }, [token]);

  const sendWhatsAppUpdate = (job, type) => {
      let text = '';
      if(type === 'collected') {
          text = `Hello ${job.customerName}, your device ${job.deviceModel} has been collected for repair. We will update you shortly.`;
      } else if (type === 'ready') {
          text = `Hello ${job.customerName}, your device ${job.deviceModel} is ready! Total cost is ₹${job.costing || 0}. Please come to pick up your device. Thanks for visiting!`;
      } else if (type === 'status') {
          text = `Hello ${job.customerName}, an update on your device ${job.deviceModel}: it is currently ${job.status}.`;
      }
      
      const url = `https://wa.me/91${job.customerPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');

      setSentStatus(prev => ({
          ...prev,
          [job._id]: {
              ...(prev[job._id] || {}),
              [type]: true
          }
      }));
  };

  const markAsComplete = async (jobId) => {
      try {
          const res = await fetch(`https://ok-ax2v.onrender.com/api/repairs/${jobId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ status: 'Completed' })
          });
          if(res.ok) {
              fetchJobs();
          }
      } catch (err) { console.error(err); }
  };

  const activeJobs = jobs.filter(job => job.status !== 'Completed');

  return (
    <div className="animate-fade-in" style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '2rem' }}>
            <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={28} /> WhatsApp Bot Center
            </h2>
            <p className="text-secondary">Send automated templates one by one to your customers.</p>
        </div>

        <div className="glass-card">
            <h3 style={{ marginBottom: '1rem' }}>Recent Customers</h3>
            {activeJobs.length === 0 ? (
                <p className="text-secondary">No active jobs available for messaging.</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {activeJobs.map(job => {
                        const isAllSent = sentStatus[job._id]?.collected && sentStatus[job._id]?.status && sentStatus[job._id]?.ready;
                        
                        return (
                        <div key={job._id} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <div style={{ fontWeight: 'bold' }}>{job.customerName}</div>
                                <div className="text-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12}/> {job.customerPhone}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--neon-blue)', marginTop: '4px' }}>Device: {job.deviceModel} | Status: {job.status}</div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button onClick={() => sendWhatsAppUpdate(job, 'collected')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', opacity: sentStatus[job._id]?.collected ? 0.5 : 1 }}>
                                    <Send size={14}/> {sentStatus[job._id]?.collected ? 'Sent' : 'Collected Msg'}
                                </button>
                                <button onClick={() => sendWhatsAppUpdate(job, 'status')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', opacity: sentStatus[job._id]?.status ? 0.5 : 1 }}>
                                    <Send size={14}/> {sentStatus[job._id]?.status ? 'Sent' : 'Status Msg'}
                                </button>
                                <button onClick={() => sendWhatsAppUpdate(job, 'ready')} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'var(--ok-green)', color: '#000', opacity: sentStatus[job._id]?.ready ? 0.5 : 1 }}>
                                    <Send size={14}/> {sentStatus[job._id]?.ready ? 'Sent' : 'Ready for Pickup'}
                                </button>
                                {isAllSent && (
                                    <button onClick={() => markAsComplete(job._id)} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'var(--neon-purple)', color: '#fff', marginLeft: '0.5rem' }}>
                                        Complete
                                    </button>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};
export default WhatsAppCenter;
