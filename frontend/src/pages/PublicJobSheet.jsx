import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { downloadBlob } from '../utils/whatsapp';

const CHECKLIST_ITEMS = [
  'Device is Powering On',
  'Power Button is Working',
  'Volume Keys are Working',
  'Home Button is Working',
  'Display is Working',
  'Touchscreen is Working',
  'Finger Print Working',
  'Glass Broken',
  'Speaker is Working',
  'Wi-Fi is Working',
  'Bluetooth Working',
  'Charging Port is Working',
  'Headphone Jack is Working',
  'Back Cover Damaged or Broken',
  'Body is Damaged or has Dents',
  'Screw Heads are Damaged or Missing',
  'SIM Tray is Damaged or Missing',
];

const ACCESSORIES_ITEMS = [
  'Cover',
  'Adaptor',
  'USB Cable',
  'Battery',
  'Charger',
  'Earphones',
  'Original Box',
  'Warranty Card',
];

const PublicJobSheet = () => {
  const { id } = useParams();
  const [jobSheet, setJobSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchJobSheet = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com';
        const res = await fetch(`${apiUrl}/api/job-sheet/public/${id}`);
        if (!res.ok) {
          throw new Error('Job sheet not found or invalid link.');
        }
        const data = await res.json();
        setJobSheet(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJobSheet();
  }, [id]);

  const handleDownload = useCallback(async () => {
    const sheetEl = document.getElementById('public-job-sheet-container');
    if (!sheetEl) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(sheetEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const custName = (jobSheet?.customerName || 'Customer').replace(/\s+/g, '_');
        const jobNo = jobSheet?.jobNumber || 'JS-0001';
        downloadBlob(blob, `JobSheet_${custName}_${jobNo}.png`);
      }
    } catch (err) {
      console.error('Job sheet download failed:', err);
      alert('Could not download job sheet image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [jobSheet]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <p>Loading Job Sheet receipt...</p>
      </div>
    );
  }

  if (error || !jobSheet) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '1rem' }}>
        <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Oops!</h2>
          <p>{error || 'Job sheet not found.'}</p>
        </div>
      </div>
    );
  }

  const checklist = jobSheet.checklist || {};
  const accessories = jobSheet.accessories || {};
  const shop = jobSheet.shopkeeperId || {};

  const shopName = jobSheet.serviceCenterName || shop.shopName || 'Service Center';
  const shopPhone = jobSheet.serviceCenterContact || shop.phone || shop.contact || '';
  const shopAddress = jobSheet.serviceCenterAddress || shop.shopAddress || '';
  const shopEmail = jobSheet.serviceCenterEmail || shop.email || '';
  const logoUrl = jobSheet.logoUrl || shop.logoUrl || '';
  const instaQrUrl = jobSheet.instaQrUrl || shop.instaQrUrl || '';
  const googleQrUrl = jobSheet.googleQrUrl || shop.googleQrUrl || '';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 1.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
          }}
        >
          {isDownloading ? 'Generating PNG…' : '📥 Download Job Sheet Image'}
        </button>
      </div>

      {/* The Printable / Rendered Job Sheet Document */}
      <div
        id="public-job-sheet-container"
        style={{
          background: '#ffffff',
          color: '#000000',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '850px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          boxSizing: 'border-box',
        }}
      >
        {/* Header Block: Logo, Shop Info, Job Number & Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 180px', gap: '15px', marginBottom: '15px', borderBottom: '2px solid #0f172a', paddingBottom: '12px', alignItems: 'center' }}>
          {/* Logo */}
          <div style={{ width: '80px', height: '70px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', background: '#ffffff' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>NO LOGO</div>
            )}
          </div>

          {/* Shop Information */}
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}>
              {shopName}
            </div>
            <div style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
              {shopPhone && <span>Contact: {shopPhone} </span>}
              {shopEmail && <span> | Email: {shopEmail}</span>}
            </div>
            {shopAddress && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{shopAddress}</div>}
          </div>

          {/* Job Reference Details */}
          <div style={{ background: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>JOB SHEET RECEIPT</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Job No.</div>
            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>{jobSheet.jobNumber || 'JS-0001'}</div>
          </div>
        </div>

        {/* Date & Time Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>DATE</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{jobSheet.jobDate || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ACCEPTANCE TIME</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{jobSheet.acceptanceTime || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>REPAIR TYPE</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{jobSheet.repairType || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>RECEIVED BY</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{jobSheet.repairSenderInfo || '-'}</div>
          </div>
        </div>

        {/* Customer Information */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Customer Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#ffffff', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Customer Name: </span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{jobSheet.customerName}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Phone Number: </span>
              <strong style={{ fontSize: '13px', color: '#2563eb' }}>{jobSheet.customerPhone}</strong>
            </div>
            {jobSheet.customerPhone2 && (
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Secondary Phone: </span>
                <span style={{ fontSize: '12px', color: '#0f172a' }}>{jobSheet.customerPhone2}</span>
              </div>
            )}
            {jobSheet.customerEmail && (
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Email: </span>
                <span style={{ fontSize: '12px', color: '#0f172a' }}>{jobSheet.customerEmail}</span>
              </div>
            )}
            {jobSheet.customerAddress && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Address: </span>
                <span style={{ fontSize: '12px', color: '#0f172a' }}>{jobSheet.customerAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Device & Product Details */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Device & Product Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: '#ffffff', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Product Type</span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{jobSheet.productType || 'Mobile Phone'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Brand & Model</span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{jobSheet.productInfo || '-'}</strong>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>IMEI / Serial No.</span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{jobSheet.productImei || '-'}</strong>
            </div>
          </div>
        </div>

        {/* Reported Issue / Complaint */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Reported Problem / Customer Complaint
          </div>
          <div style={{ padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', fontSize: '13px', color: '#92400e', fontWeight: 600, minHeight: '40px', whiteSpace: 'pre-wrap' }}>
            {jobSheet.deviceIssue || 'No specific complaint entered.'}
          </div>
        </div>

        {/* Inward Condition Checklist */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Device Inward Condition Checklist
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {CHECKLIST_ITEMS.map((item) => {
              const status = checklist[item] || 'N/A';
              const bg = status === 'Yes' ? '#16a34a' : status === 'No' ? '#dc2626' : '#94a3b8';
              return (
                <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>{item}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: bg, color: '#ffffff' }}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessories Received */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Accessories Received
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '6px' }}>
            {ACCESSORIES_ITEMS.map((item) => {
              const isChecked = accessories[item] === 'Yes';
              return (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: isChecked ? '#16a34a' : '#94a3b8' }}>
                  <span>{isChecked ? '☑' : '☒'}</span>
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Handset Appearance & Remarks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Handset Physical Condition</div>
            <div style={{ padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#0f172a', minHeight: '40px', whiteSpace: 'pre-wrap' }}>
              {jobSheet.handsetAppearance || 'None'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Remarks / Estimated Cost</div>
            <div style={{ padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#0f172a', minHeight: '40px', whiteSpace: 'pre-wrap' }}>
              {jobSheet.remarks || 'None'}
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', minHeight: '60px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '35px' }}>CUSTOMER SIGNATURE</div>
            <div style={{ borderTop: '1px solid #000' }}></div>
          </div>
          <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', minHeight: '60px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '35px' }}>SERVICE CENTER SIGNATURE</div>
            <div style={{ borderTop: '1px solid #000' }}></div>
          </div>
        </div>

        {/* QR Codes Branding Footer */}
        {(instaQrUrl || googleQrUrl) && (
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            {instaQrUrl && (
              <div style={{ textAlign: 'center' }}>
                <img src={instaQrUrl} alt="Instagram QR" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>Instagram</div>
              </div>
            )}
            {googleQrUrl && (
              <div style={{ textAlign: 'center' }}>
                <img src={googleQrUrl} alt="Google QR" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>Google Review</div>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          div { box-shadow: none !important; }
        }
      ` }} />
    </div>
  );
};

export default PublicJobSheet;
