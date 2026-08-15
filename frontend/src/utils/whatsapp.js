/** Strip formatting and return WhatsApp-ready digits (e.g. 919876543210) */
export function normalizeIndianPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 12 && digits.startsWith('91')) return digits.slice(0, 12);
  return digits.length >= 10 ? digits : null;
}

export function buildWhatsAppUrl(phone, text) {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/** Link that opens the native WhatsApp app on mobile (for fallback button) */
export function buildWhatsAppAppLink(phone, text) {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;
  const encoded = encodeURIComponent(text);
  if (isAndroidDevice()) {
    return `intent://send?phone=${normalized}&text=${encoded}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
  }
  return `whatsapp://send?phone=${normalized}&text=${encoded}`;
}

export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

/** Save blob to device Downloads (best-effort) */
export function downloadBlob(blob, filename) {
  if (!blob) return;
  const fileUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = fileUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(fileUrl);
  }, 1000);
}

function openViaAnchor(href) {
  const a = document.createElement('a');
  a.href = href;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 200);
}

/** Open native WhatsApp app on mobile; desktop opens wa.me in browser tab (text only) */
export function openWhatsApp(phone, text, preOpenedWindow = null) {
  const normalized = normalizeIndianPhone(phone);
  if (!normalized) return null;

  const encoded = encodeURIComponent(text);
  const waMeUrl = `https://wa.me/${normalized}?text=${encoded}`;
  const appSchemeUrl = `whatsapp://send?phone=${normalized}&text=${encoded}`;

  if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();

  if (isAndroidDevice()) {
    const intentUrl = `intent://send?phone=${normalized}&text=${encoded}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
    openViaAnchor(intentUrl);
    setTimeout(() => openViaAnchor(appSchemeUrl), 600);
    return waMeUrl;
  }

  if (isMobileDevice()) {
    window.location.href = appSchemeUrl;
    return waMeUrl;
  }

  if (preOpenedWindow && !preOpenedWindow.closed) {
    try {
      preOpenedWindow.location.href = waMeUrl;
      return waMeUrl;
    } catch {
      preOpenedWindow.close();
    }
  }

  const opened = window.open(waMeUrl, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = waMeUrl;
  return waMeUrl;
}

function buildReceiptFile(blob, filename) {
  if (!blob) return null;
  return new File([blob], filename || 'receipt.png', { type: 'image/png' });
}

/** Share receipt image + message together (mobile — opens WhatsApp with image attached) */
export async function shareReceiptWithText(blob, text, filename) {
  const file = buildReceiptFile(blob, filename);
  if (!file || !navigator.share) return false;

  const shareData = { text, files: [file], title: 'Receipt' };
  if (navigator.canShare && !navigator.canShare(shareData)) return false;

  try {
    await navigator.share(shareData);
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return false;
    console.error('Share failed:', err);
    return false;
  }
}

export async function uploadImageToDrive(blob, filename) {
  if (!blob) return null;
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, fileName: filename }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Image upload failed');
  }

  const data = await response.json();
  return data.imageUrl;
}

/**
 * Send receipt to a customer.
 * With phone → opens WhatsApp directly to that customer's chat (no contact search).
 * Without phone → share sheet fallback (image + text, user picks contact).
 */
export async function sendReceiptViaWhatsApp({
  phone,
  text,
  blob,
  filename,
  imageLink,
  preOpenedWindow = null,
}) {
  const waMeUrl = phone ? buildWhatsAppUrl(phone, text) : null;

  if (phone) {
    if (blob && !isMobileDevice() && !imageLink) downloadBlob(blob, filename);
    const url = openWhatsApp(phone, text, preOpenedWindow);
    return { mode: 'direct', url: url || waMeUrl };
  }

  if (blob) {
    const shared = await shareReceiptWithText(blob, text, filename);
    if (shared) {
      if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
      return { mode: 'share', url: null };
    }
    downloadBlob(blob, filename);
  }

  if (preOpenedWindow && !preOpenedWindow.closed) preOpenedWindow.close();
  return { mode: 'download', url: waMeUrl };
}
