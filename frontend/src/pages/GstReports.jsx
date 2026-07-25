import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, Download } from 'lucide-react';

const API = () => import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com';

const GstReports = () => {
    const { token, user } = useAuth();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) return;
        const load = async () => {
            try {
                const res = await fetch(`${API()}/api/gst/summary?year=${year}&month=${month}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) setSummary(await res.json());
            } catch (e) {
                console.error(e);
            }
        };
        load();
    }, [token, year, month]);

    const downloadExcel = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API()}/api/gst/export?year=${year}&month=${month}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `OK_ERP_GST1_${year}_${String(month).padStart(2, '0')}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert(e.message || 'Could not download report');
        } finally {
            setLoading(false);
        }
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return (
        <div className="animate-fade-in">
            <h2 className="text-gradient" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={28} /> GST Reports (GST-1)
            </h2>
            <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Exports bills where items had GST (CGST 9% + SGST 9%). Add GST per item in Inventory. GST-2 purchases not included yet.
            </p>

            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Month</label>
                        <select className="form-input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                            {months.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Year</label>
                        <input type="number" className="form-input" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2020} max={2100} />
                    </div>
                    <button className="btn btn-primary" onClick={downloadExcel} disabled={loading}>
                        <Download size={18} /> {loading ? 'Preparing…' : 'Download Excel (CSV)'}
                    </button>
                </div>
            </div>

            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Tax invoices</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.invoiceCount}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Taxable sales</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{summary.taxableAmount?.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Total GST</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{summary.gstAmount?.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem' }}>
                        <div className="text-secondary" style={{ fontSize: '0.8rem' }}>Invoice total</div>
                        <div className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{summary.finalTotal?.toLocaleString('en-IN')}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GstReports;
