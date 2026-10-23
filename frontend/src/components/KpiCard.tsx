import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle2,
  Hash,
  Percent,
  Phone,
  PhoneOff,
  XCircle,
} from 'lucide-react';
import type { Kpi } from '../api/types';

const TONE_BORDER: Record<Kpi['tone'], string> = {
  green: 'border-t-green-600',
  red: 'border-t-red-600',
  blue: 'border-t-blue-800',
  amber: 'border-t-amber-500',
};

const TONE_ICON_BG: Record<Kpi['tone'], string> = {
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-500',
  blue: 'bg-blue-50 text-axa-primary',
  amber: 'bg-amber-50 text-amber-500',
};

const ICONS: Record<Kpi['icon'], LucideIcon> = {
  phone: Phone,
  phoneOff: PhoneOff,
  check: CheckCircle2,
  x: XCircle,
  hash: Hash,
  percent: Percent,
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = ICONS[kpi.icon];
  const [deltaArrow, ...deltaRest] = kpi.deltaLabel.split(' ');
  return (
    <div className={`card border-t-2 ${TONE_BORDER[kpi.tone]} px-5 py-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-gray-500">{kpi.label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900">{kpi.value}</p>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TONE_ICON_BG[kpi.tone]}`}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1.5 text-xs text-gray-400">
        <span className="font-medium text-green-600">{deltaArrow}</span> {deltaRest.join(' ')}
      </p>
    </div>
  );
}
