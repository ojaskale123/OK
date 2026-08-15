import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { downloadBlob } from '../utils/whatsapp';

const PublicReceipt = () => {
    const { id } = useParams();
    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com'}/api/pos/public/${id}`);
                if (!res.ok) {
                    throw new Error('Receipt not found or invalid link.');
                }
                const data = await res.json();
                setBill(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchReceipt();
    }, [id]);

    const handleDownloadReceipt = useCallback(async () => {
        const receiptEl = document.getElementById('public-receipt');
        if (!receiptEl) return;

        try {
            const canvas = await html2canvas(receiptEl, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                const name = bill?.invoiceNumber
                    ? `Receipt_${bill.invoiceNumber}.png`
                    : `Receipt_${(bill?.customerName || 'Customer').replace(/\s+/g, '_')}_${id?.slice(-6) || 'bill'}.png`;
                downloadBlob(blob, name);
            }
        } catch (err) {
            console.error('Receipt download failed:', err);
            alert('Could not download receipt. Please try again.');
        }
    }, [bill, id]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5', color: '#333' }}>
                <p>Loading your receipt...</p>
            </div>
        );
    }

    if (error || !bill) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5', color: '#333' }}>
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--ok-red)', marginBottom: '1rem' }}>Oops!</h2>
                    <p>{error || 'Receipt not found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9f9f9', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
            
            {/* Action Bar (Hidden when printing) */}
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                    type="button"
                    onClick={handleDownloadReceipt}
                    style={{ background: 'var(--neon-purple)', color: '#1a1612', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(212, 184, 122, 0.3)' }}
                >
                    Download Receipt
                </button>
            </div>

            {/* The Receipt */}
            <div id="public-receipt" style={{ background: '#ffffff', color: '#000000', padding: '32px', width: '100%', maxWidth: '450px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.1)', fontFamily: 'monospace' }}>
                
                <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px dashed #000', paddingBottom: '16px' }}>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 'bold' }}>{bill.user?.shopName || 'Frndz Telecom'}</h2>
                    {bill.gstEnabled && (
                        <>
                            <p style={{ margin: '6px 0', fontWeight: 'bold' }}>TAX INVOICE</p>
                            {bill.user?.gstSettings?.gstin && (
                                <p style={{ margin: '0', fontSize: '0.9rem' }}>GSTIN: {bill.user.gstSettings.gstin}</p>
                            )}
                            {bill.invoiceNumber && (
                                <p style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>Invoice: {bill.invoiceNumber}</p>
                            )}
                        </>
                    )}
                    <p style={{ margin: '8px 0 0', fontSize: '1rem', color: '#555' }}>Thank you for your business!</p>
                </div>
                
                <div style={{ marginBottom: '24px', fontSize: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>Date:</span> <strong>{new Date(bill.date).toLocaleString()}</strong>
                    </div>
                    {bill.customerName && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span>Customer:</span> <strong>{bill.customerName}</strong>
                        </div>
                    )}
                    {bill.customerPhone && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span>Phone:</span> <strong>{bill.customerPhone}</strong>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Payment Mode:</span> <strong>{bill.paymentMode}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span>Bill No:</span> <strong>#{bill._id.slice(-6).toUpperCase()}</strong>
                    </div>
                </div>

                <div style={{ borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '16px 0', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '12px', fontSize: '1rem' }}>
                        <span style={{ flex: 2 }}>Item</span>
                        <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
                        <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                    </div>
                    {bill.items.map((item, i) => (
                        <div key={i} style={{ marginBottom: '10px', fontSize: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ flex: 2, paddingRight: '8px' }}>{item.name}</span>
                                <span style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</span>
                                <span style={{ flex: 1, textAlign: 'right' }}>₹{item.total}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px', fontStyle: 'italic' }}>
                                Section: {item.category || 'Others'}
                            </div>
                            {(item.imei1 || item.imei2) && (
                                <div style={{ fontSize: '0.85rem', color: '#555', fontFamily: 'monospace', marginTop: '2px' }}>
                                    {item.imei1 && `IMEI 1: ${item.imei1}`}
                                    {item.imei1 && item.imei2 && ' | '}
                                    {item.imei2 && `IMEI 2: ${item.imei2}`}
                                </div>
                            )}
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                {(item.applyGst || Number(item.gstRate) > 0)
                                    ? `GST: CGST ${item.cgstRate || 9}% + SGST ${item.sgstRate || 9}%`
                                    : 'No GST'}
                            </div>
                        </div>
                    ))}
                </div>

                {bill.gstEnabled ? (
                    <>
                        <div style={{ textAlign: 'right', fontSize: '1rem', marginBottom: '6px' }}>
                            <span>Taxable: </span>
                            <strong>₹{(bill.taxableAmount ?? bill.subtotal).toFixed(2)}</strong>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '1rem', marginBottom: '6px' }}>
                            <span>CGST 9%: </span>
                            <strong>₹{(bill.cgstAmount || 0).toFixed(2)}</strong>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '1rem', marginBottom: '8px' }}>
                            <span>SGST 9%: </span>
                            <strong>₹{(bill.sgstAmount || 0).toFixed(2)}</strong>
                        </div>
                    </>
                ) : (
                    <div style={{ textAlign: 'right', fontSize: '1.2rem', marginBottom: '8px' }}>
                        <span>Subtotal: </span>
                        <strong>₹{bill.subtotal.toFixed(2)}</strong>
                    </div>
                )}
                {bill.discountApplied > 0 && (
                    <div style={{ textAlign: 'right', fontSize: '1.1rem', color: 'var(--ok-red)', marginBottom: '8px' }}>
                        <span>Discount: </span>
                        <strong>-₹{bill.discountApplied.toFixed(2)}</strong>
                    </div>
                )}
                <div style={{ textAlign: 'right', fontSize: '1.4rem', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                    <span>Total: </span>
                    <strong style={{ fontSize: '1.8rem' }}>₹{bill.finalTotal.toFixed(2)}</strong>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.9rem', color: '#777' }}>
                    System generated digital receipt
                </div>
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body { background: #fff !important; }
                    .no-print { display: none !important; }
                    div { box-shadow: none !important; }
                }
            `}} />
        </div>
    );
};

export default PublicReceipt;
