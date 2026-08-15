import React, { useState, useCallback, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { normalizeIndianPhone, sendReceiptViaWhatsApp, downloadBlob, uploadImageToDrive, isMobileDevice } from '../utils/whatsapp';
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
  const { user } = useAuth();
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
  const [lastPdfLink, setLastPdfLink] = useState(null);

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
  const previewJobDate = formData.jobDate || '';

  const normalizedCustomerPhone = useMemo(() => {
    return normalizeIndianPhone(formData.customerPhone);
  }, [formData.customerPhone]);

  const getWhatsAppText = useCallback((imageLink) => {
    const lines = [
      `Hello! Hope you are doing well. Your Job Sheet is ready and I have shared it with you here.`,
      ``,
      `Job No: ${jobReference || 'N/A'}`,
      `Date: ${previewJobDate || 'N/A'}`,
      `Time: ${formData.acceptanceTime || 'N/A'}`,
      `Customer: ${formData.customerName || 'N/A'}`,
      `Phone: ${formData.customerPhone || 'N/A'}`,
      `Device: ${formData.productType || 'Mobile Phone'} - ${formData.productInfo || 'N/A'}`,
      `IMEI: ${formData.productImei || 'N/A'}`,
      `Issue: ${formData.deviceIssue || 'N/A'}`,
      `Repair Type: ${formData.repairType || 'N/A'}`,
      ``,
      `Thank you for choosing ${formData.serviceCenterName || 'our service center'}.`,
      `We appreciate your trust and wish you a smooth and speedy repair!`,
    ];

    if (imageLink) {
      lines.push('', `➡️ View your Job Sheet here: ${imageLink}`);
    }

    return lines.join('\n');
  }, [formData, jobReference, previewJobDate]);

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
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedForm = clonedDoc.getElementById('job-sheet-full-form');
          if (!clonedForm) return;
          clonedForm.classList.add('capturing-mode');

          clonedForm.querySelectorAll('input, textarea').forEach((field) => {
            const value = field.value || field.placeholder || '';
            const replacement = clonedDoc.createElement('div');
            const style = clonedDoc.defaultView.getComputedStyle(field);

            replacement.textContent = value;
            replacement.style.display = 'inline-block';
            replacement.style.width = style.width;
            replacement.style.minHeight = style.height;
            replacement.style.font = style.font;
            replacement.style.color = style.color;
            replacement.style.background = 'transparent';
            replacement.style.border = 'none';
            replacement.style.padding = style.padding;
            replacement.style.margin = style.margin;
            replacement.style.lineHeight = style.lineHeight;
            replacement.style.whiteSpace = 'pre-wrap';
            replacement.style.wordWrap = 'break-word';
            replacement.style.boxSizing = 'border-box';

            field.replaceWith(replacement);
          });
        },
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
    const mobile = isMobileDevice();
    const whatsappWindow = !mobile ? window.open('about:blank', '_blank') : null;

    setIsGenerating(true);
    const blob = await captureJobSheet();
    setIsGenerating(false);

    if (!blob) {
      setErrorMessage('Unable to generate job sheet image. Please try again.');
      return;
    }

    downloadBlob(blob, `JobSheet_${filenameBase}.png`);
    incrementJobCounter();
    setSuccessMessage('Job sheet downloaded successfully as PNG.');
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
    const blob = await captureJobSheet();
    const pdfFileName = `JobSheet_${filenameBase}.pdf`;

    if (!blob) {
      setIsGenerating(false);
      setErrorMessage('Unable to generate job sheet image. Please try again.');
      return;
    }

    // Try to convert captured image to a single-page PDF, upload it, and open direct WhatsApp chat with link
    try {
      const imgDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const img = new Image();
      img.src = imgDataUrl;
      await img.decode();

      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: img.width > img.height ? 'landscape' : 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      const imgWidth = img.width * scale;
      const imgHeight = img.height * scale;
      const x = (pageWidth - imgWidth) / 2;
      const y = margin;

      pdf.addImage(imgDataUrl, 'PNG', x, y, imgWidth, imgHeight);

      const pdfBlob = pdf.output('blob');

      let pdfLink = null;
      try {
        pdfLink = await uploadImageToDrive(pdfBlob, pdfFileName);
      } catch (uploadErr) {
        console.warn('PDF upload failed, falling back to image upload:', uploadErr);
      }

      // If PDF upload didn't work, try uploading original PNG image and send that link
      if (!pdfLink) {
        try {
          const imageFileName = `JobSheet_${filenameBase}.png`;
          pdfLink = await uploadImageToDrive(blob, imageFileName);
        } catch (imgUploadErr) {
          console.warn('Image upload also failed:', imgUploadErr);
        }
      }

      if (pdfLink) setLastPdfLink(pdfLink);

      const text = getWhatsAppText(pdfLink);

        try {
          await sendReceiptViaWhatsApp({
            phone: formData.customerPhone,
            text,
            filename: pdfFileName,
            imageLink: pdfLink,
            preOpenedWindow: whatsappWindow,
          });
        incrementJobCounter();
        setSuccessMessage(`Job sheet sent to customer (${formData.customerPhone}) via WhatsApp.`);
      } catch (err) {
        console.error('Failed to open WhatsApp chat', err);
        if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
        // Fallback: if upload failed entirely, download PDF locally so user can share manually
        downloadBlob(pdfBlob || blob, pdfFileName);
        setErrorMessage('Could not open WhatsApp directly. Job sheet downloaded, please share manually.');
      }
    } catch (genErr) {
      console.error('PDF generation failed, falling back to previous flow', genErr);
      // Fallback to previous image-link send flow
      try {
        const imageFileName = `JobSheet_${filenameBase}.png`;
        let imageLink = null;
        try {
          imageLink = await uploadImageToDrive(blob, imageFileName);
        } catch (uploadErr) {
          console.warn('Image upload failed in fallback:', uploadErr);
        }

        const text = getWhatsAppText(imageLink);
        await sendReceiptViaWhatsApp({ phone: formData.customerPhone, text, filename: imageFileName, imageLink });
        incrementJobCounter();
        setSuccessMessage(`Job sheet link sent to customer (${formData.customerPhone}) via WhatsApp.`);
      } catch (err) {
        console.error('Fallback send failed', err);
        downloadBlob(blob, `JobSheet_${filenameBase}.png`);
        setErrorMessage('Could not send job sheet. It has been downloaded for manual sharing.');
      }
      try {
        const imageFileName = `JobSheet_${filenameBase}.png`;
        let imageLink = null;
        try {
          imageLink = await uploadImageToDrive(blob, imageFileName);
        } catch (uploadErr) {
          console.warn('Image upload also failed:', uploadErr);
        }

        const text = getWhatsAppText(imageLink);
        if (imageLink) setLastPdfLink(imageLink);

        try {
          await sendReceiptViaWhatsApp({ phone: formData.customerPhone, text, filename: imageFileName, imageLink, preOpenedWindow: whatsappWindow });
          incrementJobCounter();
          setSuccessMessage(`Job sheet link sent to customer (${formData.customerPhone}) via WhatsApp.`);
        } catch (err) {
          console.error('Fallback send failed', err);
          if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
          downloadBlob(blob, `JobSheet_${filenameBase}.png`);
          setErrorMessage('Could not send job sheet. It has been downloaded for manual sharing.');
        }
      } catch (err) {
        console.error('Fallback send failed', err);
        if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
        downloadBlob(blob, `JobSheet_${filenameBase}.png`);
        setErrorMessage('Could not send job sheet. It has been downloaded for manual sharing.');
      }
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
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 13px;
          color: #0f172a;
          font-weight: 500;
          box-sizing: border-box;
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
          padding: 6px 10px;
          font-size: 13px;
          color: #0f172a;
          font-weight: 500;
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

        /* Print / HTML2Canvas Clean Mode */
        .capturing-mode .js-input,
        .capturing-mode .js-textarea {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 6px 0 !important;
          color: #000000 !important;
          font-weight: 600 !important;
          line-height: 1.4 !important;
          min-height: 1.8rem !important;
          box-sizing: border-box !important;
        }

        .capturing-mode .js-input::placeholder,
        .capturing-mode .js-textarea::placeholder {
          color: rgba(0,0,0,0.5) !important;
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
            Fill the job sheet document directly below. Your profile image is automatically loaded as the logo.
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
            <Download size={16} /> {isGenerating ? 'Generating…' : 'Download PNG'}
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

      {/* Unified Full Job Sheet Document Form */}
      <div id="job-sheet-full-form" className="job-sheet-container">
        {/* Header Block: Logo, Shop Info, Job Number & Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 80px) minmax(0, 1fr) minmax(0, 180px)', gap: '15px', marginBottom: '15px', borderBottom: '2px solid #0f172a', paddingBottom: '12px', alignItems: 'center', minWidth: 0 }}>
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
            <Download size={18} /> {isGenerating ? 'Generating…' : 'Download Job Sheet'}
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

      {lastPdfLink && (
        <div style={{ maxWidth: '920px', margin: '1rem auto', padding: '1rem', background: '#f8fafc', borderRadius: '10px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Job Sheet Link</div>
            <div style={{ fontSize: '0.9rem', color: '#475569', overflowWrap: 'anywhere' }}>{lastPdfLink}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(lastPdfLink)}>Copy Link</button>
            <a className="btn" href={lastPdfLink} target="_blank" rel="noopener noreferrer" style={{ background: '#2563eb', color: '#fff', padding: '0.55rem 0.9rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' }}>Open Link</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobSheet;

