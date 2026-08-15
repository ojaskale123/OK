/** Monday-starting week; weekOffset 0 = current week */
export function getWeekRange(weekOffset = 0) {
  const now = new Date();
  const dow = now.getDay();
  const toMonday = dow === 0 ? -6 : 1 - dow;

  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + toMonday + weekOffset * 7);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const date = formatDateLocal(d);
    const today = formatDateLocal(new Date());
    days.push({
      date,
      label: d.toLocaleDateString('en-IN', { weekday: 'narrow' }),
      dayNum: d.getDate(),
      isToday: date === today,
      isFuture: date > today,
    });
  }

  return {
    days,
    from: days[0].date,
    to: days[6].date,
    label: `${formatDisplay(days[0].date)} – ${formatDisplay(days[6].date)}`,
  };
}

function formatDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export { formatDateLocal };

function formatDisplay(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function buildLogsMap(logs) {
  const map = new Map();
  logs.forEach((log) => {
    const workerId = log.workerId?._id || log.workerId;
    if (!workerId || !log.date) return;
    map.set(`${workerId}-${log.date}`, log);
  });
  return map;
}

export function dayStatusForWorker(workerId, day, logsMap) {
  if (day.isFuture) return 'future';

  const log = logsMap.get(`${workerId}-${day.date}`);
  if (log?.checkInTime) return 'present';

  const today = formatDateLocal(new Date());
  if (day.date === today && !log) return 'pending';
  if (day.date < today && !log) return 'absent';

  if (log?.status === 'Absent') return 'absent';
  return 'pending';
}

export function buildWorkerWeekDays(workerId, weekDays, logsMap) {
  return weekDays.map((day) => ({
    ...day,
    status: dayStatusForWorker(workerId, day, logsMap),
  }));
}
