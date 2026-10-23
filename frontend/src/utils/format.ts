const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "21 Oct, 2:41:37.296 PM" — matches the source DB DATETIME(6) display. */
export function formatTimeMs(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  let h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ms = d.getMilliseconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  const mss = String(ms).padStart(3, '0');
  return `${day} ${month}, ${h}:${mm}:${ss}.${mss} ${ampm}`;
}

/** "21 Oct, 2:41 PM" — for table rows in reports. */
export function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate();
  const month = MONTHS_SHORT[d.getMonth()];
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${day} ${month}, ${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** "01 Oct 2026" */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "9:00 AM" */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** "01 Oct 2026 9:00:00 AM – 21 Oct 2026 5:00:00 PM" — report range line. */
export function formatRange(start: number, end: number): string {
  const fmt = (ts: number): string => {
    const d = new Date(ts);
    let h = d.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const p = (n: number): string => String(n).padStart(2, '0');
    return `${p(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()} ${h}:${p(
      d.getMinutes(),
    )}:${p(d.getSeconds())} ${ampm}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

/** "Oct 15" for chart axis labels. */
export function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/** "2026-10-21" for date input values. */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "14:30" for time input values. */
export function toTimeInputValue(ts: number): string {
  const d = new Date(ts);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  const rounded = Math.round(abs * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return delta >= 0 ? `▲ ${text}` : `▼ ${text}`;
}
