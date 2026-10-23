import { Link } from 'react-router-dom';
import { Clock3, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { RoleChip } from './RoleChip';
import { formatTimeMs, initials } from '../utils/format';

export function Topbar({ title, lastUpdated }: { title: string; lastUpdated?: number }) {
  const { fullName, role } = useAuth();
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6">
      <h1 className="text-[15px] font-bold text-gray-900">{title}</h1>
      <div className="ml-auto flex items-center gap-4">
        {lastUpdated !== undefined && (
          <span className="hidden items-center gap-1.5 text-xs text-gray-400 md:flex">
            <Clock3 size={13} />
            Last updated: {formatTimeMs(lastUpdated)}
          </span>
        )}
        <Link
          to="/settings"
          aria-label="Settings"
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Settings size={18} />
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-axa-primary text-xs font-semibold text-white">
            {initials(fullName) || 'U'}
          </span>
          <span className="hidden text-sm font-medium text-gray-800 lg:block">{fullName}</span>
          <RoleChip role={role ?? 'supervisor'} />
        </div>
      </div>
    </header>
  );
}
