import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Clock, CheckCircle, ChevronLeft, ChevronRight, Coffee } from 'lucide-react';
import WorkerWeekCalendar from '../components/WorkerWeekCalendar';
import { getWeekRange, buildLogsMap, buildWorkerWeekDays } from '../utils/attendanceWeek';
import {
  formatTime12,
  formatBreakRemaining,
  isBreakActive,
  checkoutReasonLabel,
} from '../utils/formatTime';

const API = () => import.meta.env.VITE_API_URL || 'https://ok-ax2v.onrender.com';

const Attendance = () => {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const [clockedIn, setClockedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [shopCenter, setShopCenter] = useState(null);
  const checkoutInFlight = useRef(false);
  const breakExpiryHandled = useRef(false);

  const week = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const logsMap = useMemo(() => buildLogsMap(logs), [logs]);

  const calendarWorkers = useMemo(() => {
    if (user?.role === 'worker') {
      return [{ _id: user._id, name: user.name || 'You' }];
    }
    return workers;
  }, [user, workers]);

  const workerCalendars = useMemo(
    () =>
      calendarWorkers.map((w) => ({
        worker: w,
        days: buildWorkerWeekDays(w._id, week.days, logsMap),
      })),
    [calendarWorkers, week.days, logsMap]
  );

  const fetchShopCenter = async () => {
    try {
      const res = await fetch(`${API()}/api/attendance/shop-location`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setShopCenter(await res.json());
    } catch (e) {
      console.error('Error fetching shop center location:', e);
    }
  };

  const fetchWorkers = async () => {
    if (!token || user?.role === 'worker') return;
    try {
      const res = await fetch(`${API()}/api/workers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setWorkers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTodayStatus = async () => {
    if (!token || user?.role !== 'worker') return;
    try {
      const res = await fetch(`${API()}/api/attendance/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { record } = await res.json();
        setTodayRecord(record || null);
        setClockedIn(Boolean(record && !record.checkOutTime));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        limit: '200',
        from: week.from,
        to: week.to,
      });
      const res = await fetch(`${API()}/api/attendance?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items || [];
        setLogs(items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchLogs();
    fetchWorkers();
    if (user?.role === 'worker') {
      fetchShopCenter();
      fetchTodayStatus();
    }
  }, [token, user?.role, week.from, week.to]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (user?.role !== 'worker' || !clockedIn) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [user?.role, clockedIn]);

  const onBreak = isBreakActive(todayRecord, now);
  const breakRemainingMs =
    onBreak && todayRecord?.breakEndTime
      ? new Date(todayRecord.breakEndTime).getTime() - now
      : 0;
  const canStartBreak =
    clockedIn && todayRecord && !todayRecord.breakStartTime && !onBreak;

  const handleAction = useCallback(
    async (type, isAuto = false, autoReason = 'geofence') => {
      if (type === 'check-out' && checkoutInFlight.current) return;
      if (type === 'check-out') checkoutInFlight.current = true;

      setLoading(true);
      setStatusMsg(
        `Processing ${type === 'check-in' ? 'Check In' : isAuto ? 'Auto Check Out' : 'Check Out'}...`
      );

      try {
        if (type === 'check-in') {
          setStatusMsg('Getting GPS location...');
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              const res = await fetch(`${API()}/api/attendance/check-in`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ location }),
              });
              const data = await res.json();
              if (res.ok) {
                setStatusMsg('Successfully Clocked In!');
                fetchTodayStatus();
                fetchLogs();
              } else {
                setStatusMsg(`Error: ${data.message}`);
              }
              setLoading(false);
            },
            () => {
              setStatusMsg('Location access is required to clock in. Please enable GPS.');
              setLoading(false);
            },
            { enableHighAccuracy: true }
          );
        } else if (type === 'check-out') {
          const reason = isAuto ? autoReason : 'manual';
          const res = await fetch(`${API()}/api/attendance/check-out`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reason }),
          });
          const data = await res.json();
          if (res.ok) {
            setStatusMsg(
              isAuto
                ? autoReason === 'break_expired_outside'
                  ? 'Break ended and you are still away — auto clocked out.'
                  : 'You went outside the 100m radius. Auto clocked out!'
                : 'Successfully Clocked Out!'
            );
            fetchTodayStatus();
            fetchLogs();
          } else {
            setStatusMsg(`Error: ${data.message}`);
          }
          setLoading(false);
          checkoutInFlight.current = false;
        }
      } catch {
        setStatusMsg('Failed to connect to server');
        setLoading(false);
        checkoutInFlight.current = false;
      }
    },
    [token]
  );

  const handleStartBreak = async () => {
    setLoading(true);
    setStatusMsg('Starting break...');
    try {
      const res = await fetch(`${API()}/api/attendance/break/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg('Break started — 90 minutes. You may leave the shop area.');
        fetchTodayStatus();
        fetchLogs();
      } else {
        setStatusMsg(`Error: ${data.message}`);
      }
    } catch {
      setStatusMsg('Failed to start break');
    }
    setLoading(false);
  };

  useEffect(() => {
    let watchId;
    if (clockedIn && shopCenter && user?.role === 'worker') {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const breakEndMs = todayRecord?.breakEndTime
            ? new Date(todayRecord.breakEndTime).getTime()
            : 0;
          const breakActive = breakEndMs > Date.now();
          const breakExpired = breakEndMs > 0 && breakEndMs <= Date.now();

          const dist = getDistance(
            pos.coords.latitude,
            pos.coords.longitude,
            shopCenter.lat,
            shopCenter.lng
          );

          if (breakActive) return;

          if (breakExpired && dist > 100) {
            navigator.geolocation.clearWatch(watchId);
            handleAction('check-out', true, 'break_expired_outside');
            return;
          }

          if (dist > 100) {
            navigator.geolocation.clearWatch(watchId);
            handleAction('check-out', true, 'geofence');
          }
        },
        (err) => console.log('Geolocation watcher error:', err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [clockedIn, shopCenter, todayRecord?.breakEndTime, handleAction, user?.role]);

  useEffect(() => {
    if (!clockedIn || !shopCenter || user?.role !== 'worker' || !todayRecord?.breakEndTime) {
      breakExpiryHandled.current = false;
      return;
    }

    const breakEndMs = new Date(todayRecord.breakEndTime).getTime();
    if (now < breakEndMs) {
      breakExpiryHandled.current = false;
      return;
    }

    if (breakExpiryHandled.current || checkoutInFlight.current) return;
    breakExpiryHandled.current = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          shopCenter.lat,
          shopCenter.lng
        );
        if (dist > 100) {
          handleAction('check-out', true, 'break_expired_outside');
        }
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, [now, clockedIn, shopCenter, todayRecord?.breakEndTime, handleAction, user?.role]);

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Time & Attendance
        </h2>
        <p className="text-secondary">
          {user?.role === 'worker'
            ? 'Capture your location to clock in securely.'
            : 'Weekly attendance at a glance — green = present, red = absent.'}
        </p>
      </div>

      {user?.role !== 'worker' && (
        <div
          className="glass-card"
          style={{ marginBottom: '2rem', padding: '2rem', textAlign: 'center' }}
        >
          <h3
            style={{
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <MapPin size={24} className="text-secondary" /> Shop Location Configuration
          </h3>
          <p
            className="text-secondary"
            style={{ marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}
          >
            Set your shop center so workers can only clock in within 100 meters of this spot.
          </p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={(e) => {
              const btn = e.currentTarget;
              btn.innerHTML = 'Locating...';
              btn.disabled = true;
              navigator.geolocation.getCurrentPosition(
                async (pos) => {
                  try {
                    const res = await fetch(`${API()}/api/auth/update-location`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                      }),
                    });
                    if (res.ok) {
                      btn.innerHTML = '✓ Shop Location Saved!';
                    } else {
                      btn.innerHTML = 'Error saving location';
                    }
                  } catch {
                    btn.innerHTML = 'Network Error';
                  }
                  setTimeout(() => {
                    btn.innerHTML = 'Set Current Location as Shop Center';
                    btn.disabled = false;
                  }, 3000);
                },
                () => {
                  btn.innerHTML = 'GPS Permission Denied';
                  btn.disabled = false;
                },
                { enableHighAccuracy: true }
              );
            }}
            style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
          >
            <MapPin size={18} style={{ display: 'inline', marginRight: '8px' }} />
            Set Current Location as Shop Center
          </button>
        </div>
      )}

      {user?.role === 'worker' && (
        <div
          className="glass-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          {statusMsg && (
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                color: statusMsg.includes('Error') ? 'var(--ok-red)' : 'var(--neon-blue)',
              }}
            >
              {statusMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '520px', flexWrap: 'wrap' }}>
            {!clockedIn ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  flex: 1,
                  minWidth: '160px',
                  padding: '1rem',
                  fontSize: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: loading ? 0.7 : 1,
                }}
                onClick={() => handleAction('check-in')}
                disabled={loading}
              >
                <CheckCircle /> Clock In (GPS)
              </button>
            ) : (
              <>
                {canStartBreak && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      minWidth: '160px',
                      padding: '1rem',
                      fontSize: '1.1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'rgba(255, 193, 7, 0.15)',
                      color: '#ffc107',
                      borderColor: '#ffc107',
                    }}
                    onClick={handleStartBreak}
                    disabled={loading}
                  >
                    <Coffee /> Start Break (90 min)
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    minWidth: '160px',
                    padding: '1rem',
                    fontSize: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(255, 60, 60, 0.2)',
                    color: 'var(--ok-red)',
                    borderColor: 'var(--ok-red)',
                  }}
                  onClick={() => handleAction('check-out')}
                  disabled={loading}
                >
                  <Clock /> Manual Clock Out
                </button>
              </>
            )}
          </div>
          {clockedIn && onBreak && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(255, 193, 7, 0.12)',
                border: '1px solid rgba(255, 193, 7, 0.35)',
                textAlign: 'center',
              }}
            >
              <Coffee size={18} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              On break — {formatBreakRemaining(breakRemainingMs)} left
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                You can leave the shop area during break. Returns to normal tracking when break ends.
              </div>
            </div>
          )}
          {clockedIn && !onBreak && (
            <p
              style={{
                marginTop: '1rem',
                fontSize: '0.9rem',
                color: 'var(--neon-blue)',
                textAlign: 'center',
              }}
            >
              <MapPin size={16} style={{ display: 'inline', marginRight: '5px' }} />
              GPS tracking active — auto clock-out if you go 100m away
              {todayRecord?.breakStartTime ? ' (break already used today)' : ''}.
            </p>
          )}
        </div>
      )}

      {/* Weekly calendar grid */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>
              {user?.role === 'worker' ? 'My Weekly Attendance' : 'Team Weekly Attendance'}
            </h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '0.35rem 0 0' }}>
              {week.label} (Mon – Sun)
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.6rem' }}
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              This week
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.6rem' }}
              onClick={() => setWeekOffset((w) => w + 1)}
              disabled={weekOffset >= 0}
              aria-label="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: 'rgba(127, 168, 146, 0.45)',
                border: '2px solid var(--ok-green)',
              }}
            />
            Present (clocked in)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: 'rgba(196, 132, 122, 0.4)',
                border: '2px solid var(--ok-red)',
              }}
            />
            Absent
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                border: '2px dashed rgba(255,255,255,0.3)',
              }}
            />
            Today (not yet in)
          </span>
        </div>

        {workerCalendars.length === 0 ? (
          <p className="text-secondary" style={{ textAlign: 'center', padding: '2rem 0' }}>
            {user?.role !== 'worker'
              ? 'No workers added yet. Add staff from Workers & Staff page.'
              : 'No attendance data for this week.'}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: '1rem',
            }}
          >
            {workerCalendars.map(({ worker, days }) => (
              <WorkerWeekCalendar key={worker._id} workerName={worker.name} days={days} />
            ))}
          </div>
        )}
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem' }}>
          {user?.role !== 'worker' ? 'Team Attendance History' : 'My Attendance History'}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem 0' }}>Date</th>
                {user?.role !== 'worker' && <th>Worker Name</th>}
                <th>Check In</th>
                <th>Break</th>
                <th>Check Out</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={user?.role !== 'worker' ? 6 : 5}
                    className="text-secondary"
                    style={{ padding: '2rem 0', textAlign: 'center' }}
                  >
                    No attendance records for this week.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0' }}>{log.date}</td>
                    {user?.role !== 'worker' && <td>{log.workerId?.name || 'Unknown'}</td>}
                    <td className="amount-receive">{formatTime12(log.checkInTime)}</td>
                    <td style={{ fontSize: '0.9rem' }}>
                      {log.breakStartTime
                        ? `${formatTime12(log.breakStartTime)} – ${formatTime12(log.breakEndTime)}`
                        : '--'}
                    </td>
                    <td className="amount-give">{formatTime12(log.checkOutTime)}</td>
                    <td className="text-secondary" style={{ fontSize: '0.85rem' }}>
                      {checkoutReasonLabel(log.checkOutReason) || '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
