import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ScrollText, FileSpreadsheet, Hash, Package, Wallet, ShieldCheck, Box, UserPlus, ArrowRightLeft } from 'lucide-react';

const History = () => {
    const { token } = useAuth();
    const [history, setHistory] = useState([]);

    useEffect(() => {
        fetch('https://ok-ax2v.onrender.com/api/history', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
            if(Array.isArray(data)) setHistory(data);
        });
    }, [token]);

    const totalSales = history
        .filter(log => log.actionType === 'POS_BILL')
        .reduce((acc, curr) => acc + (curr.metadata?.finalTotal || 0), 0);

    return (
        <div className="animate-fade-in">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <h2 className="text-gradient">Complete Action History</h2>
                <div className="glass-card" style={{padding: '0.8rem 1.5rem'}}>
                    <span className="text-secondary" style={{fontSize: '0.9rem'}}>Gross Lifetime Volume:</span>
                    <h3 className="amount-receive">₹{totalSales.toLocaleString()}</h3>
                </div>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {history.length === 0 ? (
                    <div className="glass-card" style={{textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)'}}>
                        <ScrollText size={48} style={{opacity: 0.3, marginBottom: '1rem', margin: '0 auto'}} />
                        <h3>No Action History Yet</h3>
                        <p>Complete actions via POS, Inventory, or Cashbook to see your audit logs here.</p>
                    </div>
                ) : (
                    history.map((log) => {
                        // POS BILL
                        if (log.actionType === 'POS_BILL') {
                            const bill = log.metadata;
                            return (
                                <div key={log._id} className="glass-card" style={{display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden'}}>
                                    {/* Receipt Header */}
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                            <div style={{background: 'rgba(56, 189, 248, 0.1)', padding: '0.5rem', borderRadius: '8px', color: '#38bdf8'}}>
                                                <ScrollText size={20} />
                                            </div>
                                            <div>
                                                <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>{bill.customerName}</div>
                                                {bill.customerPhone && <div className="text-secondary" style={{fontSize: '0.85rem'}}>{bill.customerPhone}</div>}
                                            </div>
                                        </div>
                                        <div style={{textAlign: 'right'}}>
                                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace'}}>
                                                <Hash size={12}/> {bill.billId || log._id}
                                            </div>
                                            <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                                                {new Date(log.date).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Dump */}
                                    <div style={{padding: '1.5rem'}}>
                                        <div style={{display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 100px 100px', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '0.5rem'}}>
                                            <div>Item Descr.</div>
                                            <div style={{textAlign: 'center'}}>Qty x Price</div>
                                            <div style={{textAlign: 'right'}}>Total</div>
                                        </div>
                                        
                                        {bill.items?.map(item => (
                                            <div key={item.product || item.name} style={{display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 100px 100px', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>
                                                <div>{item.name}</div>
                                                <div className="text-secondary" style={{textAlign: 'center'}}>{item.quantity} x ₹{item.price}</div>
                                                <div style={{textAlign: 'right'}}>₹{item.total}</div>
                                            </div>
                                        ))}

                                        <div style={{marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end'}}>
                                            <div style={{textAlign: 'right', display: 'inline-block', minWidth: '200px'}}>
                                                {bill.subtotal !== undefined && <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem'}}><span className="text-secondary">Subtotal</span> <span>₹{Number(bill.subtotal).toFixed(2)}</span></div>}
                                                {bill.discountApplied > 0 && <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem'}}><span className="text-secondary">Discount</span> <span>-₹{Number(bill.discountApplied).toFixed(2)}</span></div>}
                                                <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold'}}>
                                                    <span>Paid Final</span> <span className="text-gradient">₹{(bill.finalTotal || 0).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // INVENTORY OR CASHBOOK ACTIONS
                        let Icon = FileSpreadsheet;
                        let iconColor = '#94a3b8';
                        let iconBg = 'rgba(148, 163, 184, 0.1)';

                        if (log.actionType === 'PRODUCT_ADD') { Icon = Box; iconColor = '#10b981'; iconBg = 'rgba(16, 185, 129, 0.1)'; }
                        if (log.actionType === 'PRODUCT_EDIT') { Icon = Package; iconColor = '#f59e0b'; iconBg = 'rgba(245, 158, 11, 0.1)'; }
                        if (log.actionType === 'CASHBOOK_PERSON_ADD') { Icon = UserPlus; iconColor = '#6366f1'; iconBg = 'rgba(99, 102, 241, 0.1)'; }
                        if (log.actionType === 'CASHBOOK_TXN_ADD') { Icon = ArrowRightLeft; iconColor = '#ec4899'; iconBg = 'rgba(236, 72, 153, 0.1)'; }

                        return (
                            <div key={log._id} className="glass-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                    <div style={{background: iconBg, padding: '0.6rem', borderRadius: '8px', color: iconColor}}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div style={{fontWeight: 'bold', fontSize: '1rem'}}>{log.description}</div>
                                        <div className="text-secondary" style={{fontSize: '0.85rem'}}>
                                            {log.actionType === 'PRODUCT_ADD' && `Stock Set: ${log.metadata?.stockQuantity}`}
                                            {log.actionType === 'PRODUCT_EDIT' && `Updated Stock/Details`}
                                            {log.actionType === 'CASHBOOK_TXN_ADD' && `Type: ${log.metadata?.type?.toUpperCase()} | Amount: ₹${log.metadata?.amount}`}
                                        </div>
                                    </div>
                                </div>
                                <div style={{textAlign: 'right'}}>
                                    <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                                        {new Date(log.date).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default History;
