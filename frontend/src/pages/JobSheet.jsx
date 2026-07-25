import React, { useState, useCallback, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import { apiFetch, authHeaders } from '../utils/api';
import { normalizeIndianPhone, openWhatsApp, downloadBlob } from '../utils/whatsapp';
import { Download, Send, ClipboardList, Check, Smartphone, User, Phone, MapPin, Calendar, FileText, Settings, Sparkles, MessageSquare } from 'lucide-react';

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

const JobSheet = () => {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    jobNumber: '',
    jobDate: '',
    acceptanceTime: '',
    serviceCenterName: '',
    serviceCenterContact: '',
    serviceCenterAddress: '',
    serviceCenterEmail: '',
    serviceCenterTiming: '',
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    customerPhone: '',
    customerPhone2: '',
    sendForRepairType: '',
    dealerInfo: '',
    repairSenderInfo: '',
    productInfo: '',
    productType: 'Mobile Phone',
    productImei: '',
    purchaseDate: '',
    repairType: 'General Repair',
    handsetAppearance: '',
    solution: '',
    remarks: '',
    logoUrl: '',
    instaQrUrl: '',
    googleQrUrl: '',
    deviceIssue: '',
  });

  const [checklist, setChecklist] = useState({});
  const [accessories, setAccessories] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showBrandingOptions, setShowBrandingOptions] = useState(false);

  const previewDate = useMemo(() => new Date(), []);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateChecklist = (item, value) => {
    setChecklist((prev) => ({ ...prev, [item]: value }));
  };

  const updateAccessories = (item, value) => {
    setAccessories((prev) => ({ ...prev, [item]: value }));
  };

  // Prefill service center fields and branding from profile
  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      serviceCenterName: prev.serviceCenterName || user.shopName || 'Frndz Telecom',
      serviceCenterContact: prev.serviceCenterContact || user.phone || user.contact || '',
      serviceCenterAddress: prev.serviceCenterAddress || user.shopAddress || user.address || '',
      serviceCenterEmail: prev.serviceCenterEmail || user.email || '',
      serviceCenterTiming: prev.serviceCenterTiming || 'Mon-Sat: 10am - 8pm',
      logoUrl: user.logoUrl || prev.logoUrl || user.profilePicture || '',
      instaQrUrl: user.instaQrUrl || prev.instaQrUrl || '',
      googleQrUrl: user.googleQrUrl || prev.googleQrUrl || '',
    }));
  }, [user]);

  // Auto-generate date, time and sequential job number (starting from JS-0001)
  useEffect(() => {
    const now = previewDate || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const storageKey = `ok_jobsheet_counter_${user?._id || 'default'}`;
    let savedCounter = parseInt(localStorage.getItem(storageKey) || '1', 10);
    if (isNaN(savedCounter) || savedCounter < 1) {
      savedCounter = 1;
      localStorage.setItem(storageKey, '1');
    }
    const autoJobNo = `JS-${String(savedCounter).padStart(4, '0')}`;

    setFormData((prev) => ({
      ...prev,
      jobDate: prev.jobDate || isoDate,
      acceptanceTime: prev.acceptanceTime || time,
      jobNumber: prev.jobNumber || autoJobNo,
    }));
  }, [user]);

  const resetJobCounterToOne = () => {
    const storageKey = `ok_jobsheet_counter_${user?._id || 'default'}`;
    localStorage.setItem(storageKey, '1');
    setFormData((prev) => ({ ...prev, jobNumber: 'JS-0001' }));
  };

  const incrementJobCounter = () => {
    const storageKey = `ok_jobsheet_counter_${user?._id || 'default'}`;
    let current = parseInt(localStorage.getItem(storageKey) || '1', 10);
    if (isNaN(current) || current < 1) current = 1;
    const nextVal = current + 1;
    localStorage.setItem(storageKey, String(nextVal));
  };

  const jobReference = formData.jobNumber || '';
  const filenameBase = `${formData.customerName?.trim().replace(/\s+/g, '_') || 'Customer'}_${jobReference || ('JS-' + String(previewDate.getTime()).slice(-6))}`;

  const normalizedCustomerPhone = useMemo(() => {
    return normalizeIndianPhone(formData.customerPhone);
  }, [formData.customerPhone]);

  const saveJobSheetToBackend = async () => {
    if (!token) return null;
    try {
      const payload = {
        ...formData,
        checklist,
        accessories,
      };
      const res = await apiFetch('/api/job-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('Error saving job sheet to backend:', err);
    }
    return null;
  };

  const captureJobSheet = useCallback(async () => {
    const formEl = document.getElementById('job-sheet-full-form');
    if (!formEl) return null;

    formEl.classList.add('capturing-mode');
    try {
      const canvas = await html2canvas(formEl, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      return blob;
    } catch (err) {
      console.error('Could not create job sheet image', err);
      return null;
    } finally {
      formEl.classList.remove('capturing-mode');
    }
  }, []);

  const handleDownload = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    setIsGenerating(true);

    await saveJobSheetToBackend();

    const blob = await captureJobSheet();
    setIsGenerating(false);

    if (!blob) {
      setErrorMessage('Unable to generate job sheet image. Please try again.');
      return;
    }

    downloadBlob(blob, `JobSheet_${filenameBase}.png`);
    incrementJobCounter();
    setSuccessMessage('Job sheet saved & downloaded successfully as PNG.');
  };

  const handleSendToCustomer = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    if (!formData.customerPhone || !formData.customerPhone.trim()) {
      setErrorMessage('Please enter customer contact number in the Customer Information section before sending.');
      return;
    }

    if (!normalizedCustomerPhone) {
      setErrorMessage(`"${formData.customerPhone}" is not a valid 10-digit mobile number. Please check and re-enter.`);
      return;
    }

    setIsGenerating(true);

    try {
      // Save Job Sheet to database & obtain public ID
      const savedSheet = await saveJobSheetToBackend();
      const sheetId = savedSheet?._id;

      const publicLink = sheetId
        ? `${window.location.origin}/job-sheet-view/${sheetId}`
        : `${window.location.origin}/job-sheet`;

      const shopName = formData.serviceCenterName || user?.shopName || 'our shop';
      const whatsappText = `Hi, this is ${shopName}! This is your receipt info:\n${publicLink}`;

      openWhatsApp(formData.customerPhone, whatsappText);
      incrementJobCounter();
      setSuccessMessage(`Job sheet saved & redirected to WhatsApp for customer (${formData.customerPhone})!`);
    } catch (err) {
      console.error('Failed to send job sheet via WhatsApp', err);
      setErrorMessage('Could not process WhatsApp redirection. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper renderer for input fields - guarantees 38px height & 0 top/bottom padding to prevent font clipping
  const renderInput = (field, placeholder, extraStyle = {}, type = 'text') => {
    const val = formData[field] || '';
    const styleObj = {
      height: '38px',
      padding: '0 10px',
      lineHeight: '38px',
      boxSizing: 'border-box',
      ...extraStyle,
    };
    return (
      <div className="js-field-wrapper">
        <div
          className="capture-val-display"
          style={{
            display: 'none',
            height: '38px',
            padding: '0 10px',
            lineHeight: '38px',
            fontSize: extraStyle.fontSize || '13px',
            fontWeight: extraStyle.fontWeight || 600,
            color: extraStyle.color || '#0f172a',
            textAlign: extraStyle.textAlign || 'left',
            textTransform: extraStyle.textTransform || 'none',
          }}
        >
          {val || placeholder || '-'}
        </div>
        <input
          className="js-input"
          type={type}
          style={styleObj}
          value={val}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  };

  // Helper renderer for textarea fields - prevents text clipping
  const renderTextarea = (field, placeholder, rows = 2, extraStyle = {}) => {
    const val = formData[field] || '';
    const minH = Math.max(rows * 24, 60);
    return (
      <div className="js-field-wrapper">
        <div
          className="capture-val-display capture-textarea-display"
          style={{
            display: 'none',
            minHeight: `${minH}px`,
            padding: '8px 10px',
            lineHeight: '1.6',
            fontSize: extraStyle.fontSize || '13px',
            fontWeight: extraStyle.fontWeight || 600,
            color: extraStyle.color || '#0f172a',
          }}
        >
          {val || placeholder || '-'}
        </div>
        <textarea
          className="js-textarea"
          rows={rows}
          style={{ minHeight: `${minH}px`, padding: '8px 10px', lineHeight: '1.6', ...extraStyle }}
          value={val}
          onChange={(e) => updateField(field, e.target.value)}
          placeholder={placeholder}
        />
      </div>
    );
  };

  return (
    <div className="animate-fade-in job-sheet-page" style={{ padding: '1.5rem', minHeight: '100vh', backgroundColor: 'var(--bg-color, #0f172a)' }}>
      <style>{`
        .job-sheet-container {
          background: #ffffff;
          color: #000000;
          border-radius: 12px;
          padding: 24px;
          max-width: 920px;
          margin: 0 auto;
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          box-sizing: border-box;
        }

        .job-sheet-section-title {
          background: #f1f5f9;
          color: #0f172a;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 6px 10px;
          border-left: 4px solid #2563eb;
          margin-bottom: 8px;
        }

        .js-field-wrapper {
          width: 100%;
          box-sizing: border-box;
        }

        .js-input {
          width: 100%;
          height: 38px !important;
          padding: 0 10px !important;
          line-height: 38px !important;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          color: #0f172a;
          font-weight: 500;
          box-sizing: border-box !important;
          transition: all 0.2s ease;
        }

        .js-input:focus {
          background: #ffffff;
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
        }

        .js-textarea {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 10px !important;
          font-size: 13px;
          color: #0f172a;
          font-weight: 500;
          min-height: 60px !important;
          line-height: 1.6 !important;
          box-sizing: border-box !important;
          resize: vertical;
          transition: all 0.2s ease;
        }

        .js-textarea:focus {
          background: #ffffff;
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
        }

        /* HTML2Canvas Clean Capture Mode - Guarantees ZERO text clipping vertically or horizontally */
        .capturing-mode .js-input,
        .capturing-mode .js-textarea {
          display: none !important;
        }

        .capturing-mode .capture-val-display {
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          height: 38px !important;
          padding: 0 10px !important;
          line-height: 38px !important;
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }

        .capturing-mode .capture-textarea-display {
          display: block !important;
          height: auto !important;
          align-items: flex-start !important;
          padding: 8px 10px !important;
          line-height: 1.6 !important;
        }

        .capturing-mode .no-capture {
          display: none !important;
        }
      `}</style>

      {/* Top Header & Actions */}
      <div style={{ maxWidth: '920px', margin: '0 auto 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, fontSize: '1.8rem', color: 'var(--text-primary, #f8fafc)' }}>
            <ClipboardList size={30} style={{ color: '#60a5fa' }} /> Job Sheet
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary, #94a3b8)' }}>
            Fill the job sheet document directly below. Sending to WhatsApp generates a public view receipt link.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBrandingOptions(!showBrandingOptions)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
          >
            <Settings size={16} /> Branding Settings
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownload}
            disabled={isGenerating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
          >
            <Download size={16} /> {isGenerating ? 'Saving…' : 'Download PNG'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSendToCustomer}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              background: '#25D366',
              color: '#ffffff',
              fontWeight: 600,
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={18} /> Send to Customer via WhatsApp
          </button>
        </div>
      </div>

      {/* Notifications */}
      {(successMessage || errorMessage) && (
        <div style={{ maxWidth: '920px', margin: '0 auto 1.2rem', padding: '1rem 1.2rem', borderRadius: '10px', background: errorMessage ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)', border: `1px solid ${errorMessage ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`, color: errorMessage ? '#fca5a5' : '#86efac', fontWeight: 500 }}>
          {errorMessage || successMessage}
        </div>
      )}

      {/* Collapsible Branding Settings */}
      {showBrandingOptions && (
        <div style={{ maxWidth: '920px', margin: '0 auto 1.5rem', padding: '1.25rem', background: 'var(--surface-color-1, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Logo Image URL</label>
            {renderInput('logoUrl', 'https://.../logo.png', {}, 'url')}
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Instagram QR URL</label>
            {renderInput('instaQrUrl', 'https://.../insta-qr.png', {}, 'url')}
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Google QR URL</label>
            {renderInput('googleQrUrl', 'https://.../google-qr.png', {}, 'url')}
          </div>
        </div>
      )}

      {/* Unified Full Job Sheet Document Form */}
      <div id="job-sheet-full-form" className="job-sheet-container">
        {/* Header Block: Logo, Shop Info, Job Number & Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 180px', gap: '15px', marginBottom: '15px', borderBottom: '2px solid #0f172a', paddingBottom: '12px', alignItems: 'center' }}>
          {/* Logo Display */}
          <div style={{ width: '80px', height: '70px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', background: '#ffffff' }}>
            {formData.logoUrl ? (
              <img src={formData.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>NO LOGO</div>
            )}
          </div>

          {/* Shop / Service Center Information Inputs */}
          <div>
            {renderInput('serviceCenterName', 'SERVICE CENTER NAME', { fontSize: '16px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' })}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {renderInput('serviceCenterContact', 'Phone / Contact', { fontSize: '12px' })}
              {renderInput('serviceCenterEmail', 'Service Center Email', { fontSize: '12px' })}
            </div>
            <div style={{ marginTop: '4px' }}>
              {renderInput('serviceCenterAddress', 'Shop Address', { fontSize: '11px' })}
            </div>
          </div>

          {/* Job Reference Details */}
          <div style={{ background: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px' }}>JOB SHEET</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Job No.</div>
            {renderInput('jobNumber', 'JS-0001', { textAlign: 'center', fontWeight: 'bold', color: '#0f172a', fontSize: '13px' })}
            <button
              type="button"
              className="no-capture"
              onClick={resetJobCounterToOne}
              title="Reset counter to JS-0001"
              style={{
                marginTop: '4px',
                padding: '2px 8px',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#2563eb',
                cursor: 'pointer',
              }}
            >
              Reset to #1
            </button>
          </div>
        </div>

        {/* Date & Time Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>DATE</label>
            {renderInput('jobDate', '', {}, 'date')}
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>ACCEPTANCE TIME</label>
            {renderInput('acceptanceTime', '', {}, 'time')}
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>REPAIR TYPE</label>
            {renderInput('repairType', 'e.g. Display Replacement')}
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>RECEIVED BY</label>
            {renderInput('repairSenderInfo', 'Staff Name')}
          </div>
        </div>

        {/* Customer Information Section */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Customer Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Customer Full Name *</label>
              {renderInput('customerName', 'Enter customer name')}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight 600, color: '#2563eb' }}>Primary Phone (WhatsApp) *</label>
              {renderInput('customerPhone', '10-digit mobile number', { borderColor: '#3b82f6' }, 'tel')}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Secondary Phone</label>
              {renderInput('customerPhone2', 'Alternate number', {}, 'tel')}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Customer Email</label>
              {renderInput('customerEmail', 'Customer email', {}, 'email')}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Customer Address</label>
              {renderInput('customerAddress', 'Customer full address')}
            </div>
          </div>
        </div>

        {/* Device & Product Details Section */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Device & Product Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Product Type</label>
              {renderInput('productType', 'e.g. SmartPhone, Laptop')}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Brand & Model</label>
              {renderInput('productInfo', 'e.g. iPhone 13 Pro, Samsung S23')}
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>IMEI / Serial No.</label>
              {renderInput('productImei', 'Enter 15-digit IMEI')}
            </div>
          </div>
        </div>

        {/* Reported Issue / Complaint */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Reported Problem / Customer Complaint</div>
          {renderTextarea('deviceIssue', 'Describe customer complaint in detail (e.g. Display broken, not charging, water damage)...', 3)}
        </div>

        {/* Checklist Grid */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Device Inward Condition Checklist</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>{item}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => updateChecklist(item, 'Yes')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: checklist[item] === 'Yes' ? '#16a34a' : '#e2e8f0',
                      color: checklist[item] === 'Yes' ? '#ffffff' : '#475569',
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChecklist(item, 'No')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: checklist[item] === 'No' ? '#dc2626' : '#e2e8f0',
                      color: checklist[item] === 'No' ? '#ffffff' : '#475569',
                    }}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChecklist(item, 'NA')}
                    style={{
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: checklist[item] === 'NA' ? '#9333ea' : '#e2e8f0',
                      color: checklist[item] === 'NA' ? '#ffffff' : '#475569',
                    }}
                  >
                    NA
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accessories Received */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Accessories Received</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '6px 0' }}>
            {ACCESSORIES_ITEMS.map((item) => (
              <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={accessories[item] === 'Yes'}
                  onChange={(e) => updateAccessories(item, e.target.checked ? 'Yes' : 'No')}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Handset Appearance & Remarks */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Handset Physical Condition</label>
            {renderTextarea('handsetAppearance', 'Scratches, dents, missing screws...', 2)}
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Remarks / Estimated Cost</label>
            {renderTextarea('remarks', 'Additional notes or cost estimate...', 2)}
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
        {(formData.instaQrUrl || formData.googleQrUrl) && (
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            {formData.instaQrUrl && (
              <div style={{ textAlign: 'center' }}>
                <img src={formData.instaQrUrl} alt="Instagram QR" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>Instagram</div>
              </div>
            )}
            {formData.googleQrUrl && (
              <div style={{ textAlign: 'center' }}>
                <img src={formData.googleQrUrl} alt="Google QR" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569' }}>Google Review</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div style={{ maxWidth: '920px', margin: '2rem auto 0', padding: '1.5rem', background: 'var(--surface-color-1, #1e293b)', borderRadius: '16px', border: '1px solid var(--border-color, #334155)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={20} style={{ color: '#fbbf24' }} /> Ready to Process Job Sheet
          </div>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
            {formData.customerPhone ? (
              <span>Target Customer WhatsApp: <strong style={{ color: '#4ade80' }}>{formData.customerPhone}</strong></span>
            ) : (
              <span style={{ color: '#f87171' }}>Enter customer phone number above to send via WhatsApp</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownload}
            disabled={isGenerating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
          >
            <Download size={18} /> {isGenerating ? 'Saving…' : 'Download Job Sheet'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSendToCustomer}
            disabled={isGenerating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.95rem',
              background: '#25D366',
              color: '#ffffff',
              fontWeight: 700,
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
            }}
          >
            <MessageSquare size={20} />
            {formData.customerPhone?.trim() ? `Send to ${formData.customerPhone} on WhatsApp` : 'Send to Customer on WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobSheet;
