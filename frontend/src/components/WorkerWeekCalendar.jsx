import React from 'react';

const STATUS_STYLES = {
  present: {
    background: 'rgba(127, 168, 146, 0.45)',
    border: '2px solid var(--ok-green)',
    color: '#dff5e8',
  },
  absent: {
    background: 'rgba(196, 132, 122, 0.4)',
    border: '2px solid var(--ok-red)',
    color: '#ffe8e5',
  },
  pending: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '2px dashed rgba(255,255,255,0.25)',
    color: 'var(--text-secondary)',
  },
  future: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.2)',
  },
};

function statusLabel(status) {
  if (status === 'present') return 'P';
  if (status === 'absent') return 'A';
  if (status === 'pending') return '·';
  return '';
}

export default function WorkerWeekCalendar({ workerName, days, summary, compact = false }) {
  const presentCount = days.filter((d) => d.status === 'present').length;
  const countedDays = days.filter((d) => d.status !== 'future').length;
  const absentCount = days.filter((d) => d.status === 'absent').length;

  return (
    <div
      className="glass-card"
      style={{
        padding: compact ? '0.75rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        minWidth: compact ? '140px' : '180px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: compact ? '0.85rem' : '0.95rem',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={workerName}
        >
          {workerName}
        </div>
        <div className="text-secondary" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
          {summary || `${presentCount}/${countedDays || 7} days`}
          {absentCount > 0 && (
            <span style={{ color: 'var(--ok-red)', marginLeft: '6px' }}>{absentCount} absent</span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {days.map((day) => (
          <div key={day.date} style={{ textAlign: 'center' }}>
            <div
              className="text-secondary"
              style={{ fontSize: '0.6rem', marginBottom: '3px', lineHeight: 1 }}
            >
              {day.label}
            </div>
            <div
              title={`${day.date} — ${day.status}`}
              style={{
                aspectRatio: '1',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                ...STATUS_STYLES[day.status],
                boxShadow: day.isToday ? '0 0 0 2px rgba(212, 184, 122, 0.5)' : 'none',
              }}
            >
              {statusLabel(day.status)}
            </div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {day.dayNum}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
