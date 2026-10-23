import { formatTimeMs } from '../utils/format';

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const escape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function timestampCsv(v: unknown): string {
  return typeof v === 'number' ? formatTimeMs(v) : v === null || v === undefined ? '' : String(v);
}
