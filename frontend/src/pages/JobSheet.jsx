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

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveJobSheetToBackend = async (imageDataBase64 = '') => {
    if (!token) return null;
    try {
      const payload = {
        ...formData,
        checklist,
        accessories,
        imageData: imageDataBase64,
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

  // Bulletproof canvas capture using dedicated static HTML container
  const captureJobSheet = useCallback(async () => {
    const printEl = document.getElementById('job-sheet-printable-area');
    if (!printEl) return null;

    try {
      const canvas = await html2canvas(printEl, {
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
    }
  }, []);

  const handleDownload = async () => {
    setSuccessMessage('');
    setErrorMessage('');
    setIsGenerating(true);

    const blob = await captureJobSheet();
    let imageBase64 = '';
    if (blob) {
      imageBase64 = await blobToBase64(blob);
    }

    await saveJobSheetToBackend(imageBase64);

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
      // 1. Capture image blob and convert to Base64
      const blob = await captureJobSheet();
      let imageBase64 = '';
      if (blob) {
        imageBase64 = await blobToBase64(blob);
      }

      // 2. Save Job Sheet to database with Base64 image & obtain public ID
      const savedSheet = await saveJobSheetToBackend(imageBase64);
      const sheetId = savedSheet?._id;

      const pageLink = sheetId
        ? `${window.location.origin}/job-sheet-view/${sheetId}`
        : `${window.location.origin}/job-sheet`;

      const apiBase = import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com';
      const imageLink = sheetId
        ? `${apiBase}/api/job-sheet/image/${sheetId}`
        : null;

      const shopName = formData.serviceCenterName || user?.shopName || 'our shop';

      let whatsappText = `Hi, this is ${shopName}! Here is your receipt & job sheet info:\n\n📄 View Complete Job Sheet:\n${pageLink}`;
      if (imageLink) {
        whatsappText += `\n\n🖼️ View Job Sheet Image:\n${imageLink}`;
      }

      openWhatsApp(formData.customerPhone, whatsappText);
      incrementJobCounter();
      setSuccessMessage(`Job sheet & image link sent via WhatsApp to customer (${formData.customerPhone})!`);
    } catch (err) {
      console.error('Failed to send job sheet via WhatsApp', err);
      setErrorMessage('Could not process WhatsApp redirection. Please try again.');
    } finally {
      setIsGenerating(false);
    }
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

        .js-input {
          width: 100%;
          height: 38px !important;
          padding: 0 12px !important;
          line-height: 38px !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
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
          padding: 8px 12px !important;
          font-size: 13px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          color: #0f172a;
          font-weight: 500;
          min-height: 60px;
          line-height: 1.5;
          box-sizing: border-box;
          resize: vertical;
          transition: all 0.2s ease;
        }

        .js-textarea:focus {
          background: #ffffff;
          border-color: #2563eb;
          outline: none;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.2);
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
            <input className="js-input" type="url" value={formData.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} placeholder="https://.../logo.png" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Instagram QR URL</label>
            <input className="js-input" type="url" value={formData.instaQrUrl} onChange={(e) => updateField('instaQrUrl', e.target.value)} placeholder="https://.../insta-qr.png" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Google QR URL</label>
            <input className="js-input" type="url" value={formData.googleQrUrl} onChange={(e) => updateField('googleQrUrl', e.target.value)} placeholder="https://.../google-qr.png" />
          </div>
        </div>
      )}

      {/* Editable Form Document */}
      <div className="job-sheet-container">
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
            <input
              className="js-input"
              style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}
              value={formData.serviceCenterName}
              onChange={(e) => updateField('serviceCenterName', e.target.value)}
              placeholder="SERVICE CENTER NAME"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <input
                className="js-input"
                style={{ fontSize: '12px' }}
                value={formData.serviceCenterContact}
                onChange={(e) => updateField('serviceCenterContact', e.target.value)}
                placeholder="Phone / Contact"
              />
              <input
                className="js-input"
                style={{ fontSize: '12px' }}
                value={formData.serviceCenterEmail}
                onChange={(e) => updateField('serviceCenterEmail', e.target.value)}
                placeholder="Service Center Email"
              />
            </div>
            <input
              className="js-input"
              style={{ fontSize: '11px', marginTop: '4px' }}
              value={formData.serviceCenterAddress}
              onChange={(e) => updateField('serviceCenterAddress', e.target.value)}
              placeholder="Shop Address"
            />
          </div>

          {/* Job Reference Details */}
          <div style={{ background: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px' }}>JOB SHEET</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Job No.</div>
            <input
              className="js-input"
              style={{ textAlign: 'center', fontWeight: 'bold', color: '#0f172a', fontSize: '13px' }}
              value={formData.jobNumber}
              onChange={(e) => updateField('jobNumber', e.target.value)}
              placeholder="JS-0001"
            />
            <button
              type="button"
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
            <input className="js-input" type="date" value={formData.jobDate} onChange={(e) => updateField('jobDate', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>ACCEPTANCE TIME</label>
            <input className="js-input" type="time" value={formData.acceptanceTime} onChange={(e) => updateField('acceptanceTime', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>REPAIR TYPE</label>
            <input className="js-input" type="text" value={formData.repairType} onChange={(e) => updateField('repairType', e.target.value)} placeholder="e.g. Display Replacement" />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>RECEIVED BY</label>
            <input className="js-input" type="text" value={formData.repairSenderInfo} onChange={(e) => updateField('repairSenderInfo', e.target.value)} placeholder="Staff Name" />
          </div>
        </div>

        {/* Customer Information Section */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Customer Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Customer Full Name *</label>
              <input className="js-input" type="text" value={formData.customerName} onChange={(e) => updateField('customerName', e.target.value)} placeholder="Enter customer name" />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>Primary Phone (WhatsApp) *</label>
              <input className="js-input" type="tel" value={formData.customerPhone} onChange={(e) => updateField('customerPhone', e.target.value)} placeholder="10-digit mobile number" style={{ borderColor: '#3b82f6' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Secondary Phone</label>
              <input className="js-input" type="tel" value={formData.customerPhone2} onChange={(e) => updateField('customerPhone2', e.target.value)} placeholder="Alternate number" />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Customer Email</label>
              <input className="js-input" type="email" value={formData.customerEmail} onChange={(e) => updateField('customerEmail', e.target.value)} placeholder="Customer email" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Customer Address</label>
              <input className="js-input" type="text" value={formData.customerAddress} onChange={(e) => updateField('customerAddress', e.target.value)} placeholder="Customer full address" />
            </div>
          </div>
        </div>

        {/* Device & Product Details Section */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Device & Product Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Product Type</label>
              <input className="js-input" type="text" value={formData.productType} onChange={(e) => updateField('productType', e.target.value)} placeholder="e.g. SmartPhone, Laptop" />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Brand & Model</label>
              <input className="js-input" type="text" value={formData.productInfo} onChange={(e) => updateField('productInfo', e.target.value)} placeholder="e.g. iPhone 13 Pro, Samsung S23" />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>IMEI / Serial No.</label>
              <input className="js-input" type="text" value={formData.productImei} onChange={(e) => updateField('productImei', e.target.value)} placeholder="Enter 15-digit IMEI" />
            </div>
          </div>
        </div>

        {/* Reported Issue / Complaint */}
        <div style={{ marginBottom: '15px' }}>
          <div className="job-sheet-section-title">Reported Problem / Customer Complaint</div>
          <textarea
            className="js-textarea"
            rows="3"
            value={formData.deviceIssue}
            onChange={(e) => updateField('deviceIssue', e.target.value)}
            placeholder="Describe customer complaint in detail (e.g. Display broken, not charging, water damage)..."
          />
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
            <textarea
              className="js-textarea"
              rows="2"
              value={formData.handsetAppearance}
              onChange={(e) => updateField('handsetAppearance', e.target.value)}
              placeholder="Scratches, dents, missing screws..."
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Remarks / Estimated Cost</label>
            <textarea
              className="js-textarea"
              rows="2"
              value={formData.remarks}
              onChange={(e) => updateField('remarks', e.target.value)}
              placeholder="Additional notes or cost estimate..."
            />
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

      {/* Hidden Static Canvas Capture Target (Positioned top:0, left:0, opacity:0 to allow full font layout calculation) */}
      <div
        id="job-sheet-printable-area"
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '850px',
          background: '#ffffff',
          color: '#000000',
          borderRadius: '12px',
          padding: '24px',
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          boxSizing: 'border-box',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -9999,
        }}
      >
        {/* Header Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 180px', gap: '15px', marginBottom: '15px', borderBottom: '2px solid #0f172a', paddingBottom: '12px', alignItems: 'center' }}>
          <div style={{ width: '80px', height: '70px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', background: '#ffffff' }}>
            {formData.logoUrl ? (
              <img src={formData.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>NO LOGO</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px' }}>
              {formData.serviceCenterName || user?.shopName || 'SERVICE CENTER'}
            </div>
            <div style={{ fontSize: '12px', color: '#334155', fontWeight: 500, lineHeight: '1.6' }}>
              {formData.serviceCenterContact && <span>Contact: {formData.serviceCenterContact} </span>}
              {formData.serviceCenterEmail && <span> | Email: {formData.serviceCenterEmail}</span>}
            </div>
            {formData.serviceCenterAddress && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', lineHeight: '1.5' }}>{formData.serviceCenterAddress}</div>}
          </div>
          <div style={{ background: '#f8fafc', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>JOB SHEET</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>Job No.</div>
            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>{formData.jobNumber || 'JS-0001'}</div>
          </div>
        </div>

        {/* Date & Time Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>DATE</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px', lineHeight: '1.5' }}>{formData.jobDate || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ACCEPTANCE TIME</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px', lineHeight: '1.5' }}>{formData.acceptanceTime || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>REPAIR TYPE</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px', lineHeight: '1.5' }}>{formData.repairType || '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>RECEIVED BY</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '2px', lineHeight: '1.5' }}>{formData.repairSenderInfo || '-'}</div>
          </div>
        </div>

        {/* Customer Information */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Customer Information
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#ffffff', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
            <div style={{ lineHeight: '1.6' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Customer Name: </span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{formData.customerName || '-'}</strong>
            </div>
            <div style={{ lineHeight: '1.6' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Phone Number: </span>
              <strong style={{ fontSize: '13px', color: '#2563eb' }}>{formData.customerPhone || '-'}</strong>
            </div>
            {formData.customerPhone2 && (
              <div style={{ lineHeight: '1.6' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Secondary Phone: </span>
                <span style={{ fontSize: '12px', color: '#0f172a' }}>{formData.customerPhone2}</span>
              </div>
            )}
            {formData.customerEmail && (
              <div style={{ lineHeight: '1.6' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Email: </span>
                <span style={{ fontSize: '12px', color: '#0f172a' }}>{formData.customerEmail}</span>
              </div>
            )}
            {formData.customerAddress && (
              <div style={{ gridColumn: '1 / -1', lineHeight: '1.6' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Address: </span>
                <span style={{ fontSize: '12px', color: '#0f172a' }}>{formData.customerAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Device & Product Details */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Device & Product Details
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', background: '#ffffff', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
            <div style={{ lineHeight: '1.6' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Product Type</span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{formData.productType || 'Mobile Phone'}</strong>
            </div>
            <div style={{ lineHeight: '1.6' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Brand & Model</span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{formData.productInfo || '-'}</strong>
            </div>
            <div style={{ lineHeight: '1.6' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>IMEI / Serial No.</span>
              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{formData.productImei || '-'}</strong>
            </div>
          </div>
        </div>

        {/* Reported Problem / Customer Complaint */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ background: '#f1f5f9', color: '#0f172a', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 10px', borderLeft: '4px solid #2563eb', marginBottom: '8px' }}>
            Reported Problem / Customer Complaint
          </div>
          <div style={{ padding: '10px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', fontSize: '13px', color: '#92400e', fontWeight: 600, minHeight: '40px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {formData.deviceIssue || 'No specific complaint entered.'}
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
            <div style={{ padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#0f172a', minHeight: '40px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {formData.handsetAppearance || 'None'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Remarks / Estimated Cost</div>
            <div style={{ padding: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#0f172a', minHeight: '40px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {formData.remarks || 'None'}
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
