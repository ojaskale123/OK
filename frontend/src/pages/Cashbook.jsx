import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, UserPlus, Filter, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';

const Cashbook = () => {
    const { user } = useAuth();
    
    // Fallback Mock State for Demo Overrides
    const [persons, setPersons] = useState([
        { _id: '1', name: 'Ramesh Sharma (Wholesaler)', netBalance: 12000 },
        { _id: '2', name: 'Suresh Hardware', netBalance: -4500 },
        { _id: '3', name: 'Amit Traders', netBalance: 0 }
    ]);
    const [messagesState, setMessagesState] = useState({
       '1': [{ _id: 1, type: 'give', amount: 3000, note: 'Advance for rice', date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
             { _id: 2, type: 'receive', amount: 15000, note: 'Final settlement', date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }],
       '2': [{ _id: 3, type: 'give', amount: 4500, note: 'Payment for paint', date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]
    });

    const [activePerson, setActivePerson] = useState(null);
    const [filter, setFilter] = useState('all'); // all, receive, give

    const [newPersonName, setNewPersonName] = useState('');
    const [newPersonAmount, setNewPersonAmount] = useState('');
    const [newPersonType, setNewPersonType] = useState('receive');

    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [type, setType] = useState('receive');

    const totalToReceive = persons.filter(p => p.netBalance > 0).reduce((a, b) => a + b.netBalance, 0);
    const totalToGive = persons.filter(p => p.netBalance < 0).reduce((a, b) => a + Math.abs(b.netBalance), 0);
    const netProfit = totalToReceive - totalToGive;

    const filteredPersons = persons.filter(p => {
        if(filter === 'receive') return p.netBalance > 0;
        if(filter === 'give') return p.netBalance < 0;
        return true;
    });

    const addPerson = (e) => {
        e.preventDefault();
        if(!newPersonName) return;

        let initialBalance = 0;
        const initialMessages = [];
        
        if (newPersonAmount && Number(newPersonAmount) > 0) {
            const amt = Number(newPersonAmount);
            initialBalance = newPersonType === 'receive' ? amt : -amt;
            initialMessages.push({
               _id: Date.now(), 
               type: newPersonType, 
               amount: amt, 
               note: 'Initial Entry',
               date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            });
        }

        const newP = { _id: Date.now().toString(), name: newPersonName, netBalance: initialBalance };
        setPersons([newP, ...persons]); // Add to top of list
        setMessagesState({...messagesState, [newP._id]: initialMessages});
        
        setNewPersonName('');
        setNewPersonAmount('');
    };

    const sendTransaction = (e) => {
        e.preventDefault();
        if(!amount || !activePerson) return;
        
        const newMsg = {
           _id: Date.now(), 
           type, 
           amount: Number(amount), 
           note: note || (type === 'receive' ? 'Received Cash' : 'Given Cash'),
           date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };

        const updatedMessages = {
            ...messagesState,
            [activePerson._id]: [...(messagesState[activePerson._id] || []), newMsg]
        };
        setMessagesState(updatedMessages);

        // Calculate new balance
        let balanceChange = type === 'receive' ? Number(amount) : -Number(amount);
        const newBalance = activePerson.netBalance + balanceChange;
        
        setPersons(persons.map(p => p._id === activePerson._id ? { ...p, netBalance: newBalance } : p));
        setActivePerson({...activePerson, netBalance: newBalance});
        
        setAmount(''); 
        setNote('');
    };

    const deletePerson = (e, personId) => {
        e.stopPropagation();
        if(window.confirm('Are you sure you want to delete this customer and their entire ledger history?')) {
            setPersons(persons.filter(p => p._id !== personId));
            if(activePerson?._id === personId) setActivePerson(null);
        }
    };

    const activeMessages = activePerson ? (messagesState[activePerson._id] || []) : [];

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '1rem' }}>
            
            {/* Top Aggregation Bar */}
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div className="glass-card" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <span className="text-secondary">Net Position</span>
                        <h2 style={{color: netProfit >= 0 ? 'var(--ok-green)' : 'var(--ok-red)'}}>
                            {netProfit >= 0 ? '+' : '-'}₹{Math.abs(netProfit)}
                        </h2>
                    </div>
                    <Filter className="text-secondary" />
                </div>
                <div className="glass-card" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid var(--ok-green)' }}>
                    <div>
                        <span className="text-secondary">Total to Receive</span>
                        <h2 className="amount-receive">₹{totalToReceive}</h2>
                    </div>
                    <ArrowDownRight color="var(--ok-green)" size={32} />
                </div>
                <div className="glass-card" style={{ flex: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid var(--ok-red)' }}>
                    <div>
                        <span className="text-secondary">Total to Give</span>
                        <h2 className="amount-give">₹{totalToGive}</h2>
                    </div>
                    <ArrowUpRight color="var(--ok-red)" size={32} />
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '1.5rem', overflow: 'hidden' }}>
                {/* Contacts Sidebar */}
                <div className="glass-card" style={{ width: '320px', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
                    <form onSubmit={addPerson} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input className="form-input" placeholder="Add New Customer..." value={newPersonName} onChange={e=>setNewPersonName(e.target.value)} required />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select className="form-input" style={{flex: 1, padding: '0.5rem', background: newPersonType === 'receive' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${newPersonType === 'receive' ? 'var(--ok-green)' : 'var(--ok-red)'}`}} value={newPersonType} onChange={e=>setNewPersonType(e.target.value)}>
                                <option value="receive">Get (+)</option>
                                <option value="give">Give (-)</option>
                            </select>
                            <input type="number" className="form-input" style={{flex: 1, padding: '0.5rem'}} placeholder="Amt ₹" value={newPersonAmount} onChange={e=>setNewPersonAmount(e.target.value)} />
                            <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} title="Add Customer"><UserPlus size={18}/></button>
                        </div>
                    </form>

                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button onClick={() => setFilter('all')} className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} style={{flex: 1, padding: '0.5rem', fontSize: '0.8rem'}}>All</button>
                        <button onClick={() => setFilter('receive')} className={`btn ${filter === 'receive' ? 'btn-primary' : 'btn-secondary'}`} style={{flex: 1, padding: '0.5rem', fontSize: '0.8rem'}}>Receive</button>
                        <button onClick={() => setFilter('give')} className={`btn ${filter === 'give' ? 'btn-primary' : 'btn-secondary'}`} style={{flex: 1, padding: '0.5rem', fontSize: '0.8rem'}}>Give</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '5px' }}>
                        {filteredPersons.map(p => (
                            <div key={p._id} onClick={() => setActivePerson(p)} 
                                 style={{ padding: '1rem', background: activePerson?._id === p._id ? 'var(--surface-color-2)' : 'transparent', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{fontWeight: 600, fontSize: '0.95rem'}}>{p.name}</div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                    <div style={{fontSize: '0.85rem', fontWeight: 'bold', color: p.netBalance >= 0 ? 'var(--ok-green)' : 'var(--ok-red)', textAlign: 'right'}}>
                                        ₹{Math.abs(p.netBalance)}<br/>
                                        <span style={{fontSize: '0.7rem', fontWeight: 'normal'}}>{p.netBalance >= 0 ? 'Receive' : 'Give'}</span>
                                    </div>
                                    <Trash2 size={16} color="var(--ok-red)" style={{opacity: 0.7}} onClick={(e) => deletePerson(e, p._id)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat UI Area */}
                <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
                    {activePerson ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                                <h3 style={{margin: 0}}>{activePerson.name}</h3>
                                <p style={{color: activePerson.netBalance >= 0 ? 'var(--ok-green)' : 'var(--ok-red)', fontSize: '0.85rem', margin: '0.2rem 0 0 0'}}>
                                    Net Balance: ₹{Math.abs(activePerson.netBalance)} {activePerson.netBalance >= 0 ? '(You will Receive)' : '(You will Give)'}
                                </p>
                            </div>

                            {/* Chat Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.01) 0%, transparent 100%)' }}>
                                {activeMessages.length === 0 ? (
                                    <div style={{margin: 'auto', color: 'var(--text-secondary)'}}>No transactions yet. Start the ledger below.</div>
                                ) : (
                                    activeMessages.map(m => (
                                        <div key={m._id} style={{
                                            alignSelf: m.type === 'receive' ? 'flex-end' : 'flex-start',
                                            background: m.type === 'receive' ? 'var(--ok-green-glow)' : 'var(--ok-red-glow)',
                                            border: `1px solid ${m.type === 'receive' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                            borderBottomRightRadius: m.type === 'receive' ? '0' : '16px',
                                            borderBottomLeftRadius: m.type === 'receive' ? '16px' : '0',
                                            padding: '1rem 1.2rem', borderRadius: '16px', minWidth: '150px', maxWidth: '70%',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                        }}>
                                            <div style={{fontSize: '1.5rem', fontWeight: '800', color: m.type === 'receive' ? 'var(--ok-green)' : 'var(--ok-red)', marginBottom: '0.25rem'}}>
                                                ₹{m.amount}
                                            </div>
                                            <div style={{fontSize: '0.95rem', color: '#fff'}}>{m.note}</div>
                                            <div style={{fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '0.5rem'}}>{m.date}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Chat Input */}
                            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                                <form onSubmit={sendTransaction} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <select className="form-input" style={{ width: '150px', background: type === 'receive' ? 'var(--ok-green-glow)' : 'var(--ok-red-glow)', border: `1px solid ${type === 'receive' ? 'var(--ok-green)' : 'var(--ok-red)'}`, color: '#fff' }} value={type} onChange={e=>setType(e.target.value)}>
                                        <option value="receive">I Got (Income)</option>
                                        <option value="give">I Gave (Expense)</option>
                                    </select>
                                    <input type="number" className="form-input" style={{flex: 1}} placeholder="Amount ₹" value={amount} onChange={e=>setAmount(e.target.value)} required />
                                    <input type="text" className="form-input" style={{flex: 2}} placeholder="Add a note or context..." value={note} onChange={e=>setNote(e.target.value)} />
                                    <button className="btn" style={{ padding: '0.8rem 1.5rem', background: type === 'receive' ? 'var(--ok-green)' : 'var(--ok-red)', color: '#000', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Send size={18}/> Send
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem'}}>
                                <UserPlus size={32} />
                            </div>
                            <h3>OK ERP Cashbook</h3>
                            <p>Select or add a contact to start managing their ledger.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Cashbook;
