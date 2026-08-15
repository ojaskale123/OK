import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, authHeaders } from '../utils/api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const PAGE_SIZE = 30;

const History = () => {
    const { token, user } = useAuth();
    const [history, setHistory] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [totalSales, setTotalSales] = useState(0);
    const [workersList, setWorkersList] = useState([]);
    const [selectedWorker, setSelectedWorker] = useState('All');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const debouncedWorker = useDebouncedValue(selectedWorker, 200);

    const fetchHistory = useCallback(async (pageNum = 1, append = false) => {
        if (!token) return;
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = new URLSearchParams({ page: String(pageNum), limit: String(PAGE_SIZE) });
            if (debouncedWorker !== 'All') params.set('worker', debouncedWorker);

            const res = await apiFetch(`/api/history?${params}`, { headers: authHeaders(token) });
            if (!res.ok) return;
            const data = await res.json();
            const items = data.items || [];
            setHistory((prev) => (append ? [...prev, ...items] : items));
            setTotal(data.total ?? items.length);
            setHasMore(Boolean(data.hasMore));
            setTotalSales(data.totalSales ?? 0);
            if (Array.isArray(data.workers)) setWorkersList(data.workers);
            setPage(pageNum);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [token, debouncedWorker]);

    useEffect(() => {
        if (!token) return;
        fetchHistory(1, false);
    }, [token, fetchHistory]);

    const deleteLog = async (id) => {
        if (!window.confirm("Are you sure you want to delete this history log?")) return;
        try {
            const res = await apiFetch(`/api/history/${id}`, {
                method: 'DELETE',
                headers: authHeaders(token),
            });
            if (res.ok) fetchHistory(1, false);
        } catch(e) { console.error(e); }
    };

    const filteredHistory = history;

    return (
        <div className="animate-fade-in">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <h2 className="text-gradient">Complete Action History</h2>
                <div className="glass-card" style={{padding: '0.8rem 1.5rem'}}>
                    <span className="text-secondary" style={{fontSize: '0.9rem'}}>Gross Lifetime Volume:</span>
                    <h3 className="amount-receive">₹{totalSales.toLocaleString()}</h3>
                </div>
            </div>

            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap'}}>
                <div className="glass-card" style={{padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px'}}>
                    <label style={{fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap'}}>Filter by Worker:</label>
                    <select 
                        value={selectedWorker} 
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="input-field" 
                        style={{background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', flex: 1}}
                    >
                        <option value="All">All Workers & Admins</option>
                        {workersList.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="glass-card" style={{padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '180px'}}>
                    <span className="text-secondary" style={{fontSize: '0.9rem'}}>Showing:</span>
                    <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--neon-purple)'}}>{filteredHistory.length} / {total}</span>
                </div>
            </div>

            {loading ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading history…</div>
            ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {filteredHistory.length === 0 ? (
                    <div className="glass-card" style={{textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)'}}>
                        <h3>No Action History Found</h3>
                        <p>No actions match the selected filter criteria.</p>
                    </div>
                ) : (
                    filteredHistory.map((log) => {
                        if (log.actionType === 'POS_BILL') {
                            const bill = log.metadata || {};
                            return (
                                <div key={log._id} className="glass-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
                                    <div>
                                        <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{bill.customerName || 'Customer'}</div>
                                        {bill.customerPhone && <div className="text-secondary" style={{fontSize: '0.85rem'}}>{bill.customerPhone}</div>}
                                        <div style={{fontSize: '0.8rem', color: 'var(--neon-blue)', marginTop: '4px'}}>Sold by: {log.performedBy || 'Owner'}</div>
                                        <div className="text-secondary" style={{fontSize: '0.85rem', marginTop: '4px'}}>{new Date(log.date).toLocaleString()}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="text-gradient" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{(bill.finalTotal || 0).toFixed(2)}</div>
                                        <div style={{display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem'}}>
                                            <button onClick={() => window.open(`/receipt/${bill.billId || log._id}`, '_blank')} className="btn btn-secondary" style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem'}}>
                                                View Receipt
                                            </button>
                                            {user?.role !== 'worker' && (
                                                <button onClick={() => deleteLog(log._id)} className="btn btn-red" style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem'}}>
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (log.actionType === 'REPAIR_JOB_ADD' || log.actionType === 'REPAIR_JOB_COMPLETE') {
                            const metadata = log.metadata || {};
                            return (
                                <div key={log._id} className="glass-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem 1.5rem', gap: '1rem', flexWrap: 'wrap'}}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{fontWeight: 'bold'}}>{log.description}</div>
                                        {metadata.deviceModel && (
                                            <div className="text-secondary" style={{fontSize: '0.85rem', marginTop: '4px'}}>
                                                Device: {metadata.deviceModel}
                                            </div>
                                        )}
                                        {metadata.itemNote ? (
                                            <div style={{marginTop: '0.6rem', padding: '0.7rem 0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', fontSize: '0.9rem'}}>
                                                <strong>Items given by customer:</strong> {metadata.itemNote}
                                            </div>
                                        ) : null}
                                        <div className="text-secondary" style={{fontSize: '0.85rem', marginTop: '0.6rem'}}>
                                            By: {log.performedBy || 'Owner'} · {new Date(log.date).toLocaleString()}
                                        </div>
                                    </div>
                                    {user?.role !== 'worker' && (
                                        <button onClick={() => deleteLog(log._id)} className="btn btn-red" style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem'}}>
                                            Delete
                                        </button>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div key={log._id} className="glass-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem'}}>
                                <div>
                                    <div style={{fontWeight: 'bold'}}>{log.description}</div>
                                    <div className="text-secondary" style={{fontSize: '0.85rem'}}>
                                        By: {log.performedBy || 'Owner'} · {new Date(log.date).toLocaleString()}
                                    </div>
                                </div>
                                {user?.role !== 'worker' && (
                                    <button onClick={() => deleteLog(log._id)} className="btn btn-red" style={{padding: '0.2rem 0.5rem', fontSize: '0.75rem'}}>
                                        Delete
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}

                {hasMore && (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={loadingMore}
                        onClick={() => fetchHistory(page + 1, true)}
                        style={{ alignSelf: 'center' }}
                    >
                        {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                )}
            </div>
            )}
        </div>
    );
};

export default History;
