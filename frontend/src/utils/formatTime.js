/** 12-hour clock for attendance tables (e.g. 2:30 PM) */
export function formatTime12(value) {
  if (!value) return '--';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatBreakRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function isBreakActive(record, nowMs = Date.now()) {
  if (!record?.breakEndTime || record.checkOutTime) return false;
  return new Date(record.breakEndTime).getTime() > nowMs;
}

export function checkoutReasonLabel(reason) {
  if (reason === 'geofence') return 'Auto (left shop area)';
  if (reason === 'break_expired_outside') return 'Auto (break over, still away)';
  return '';
}
