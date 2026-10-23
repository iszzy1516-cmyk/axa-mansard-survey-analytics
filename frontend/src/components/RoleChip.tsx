import type { Role } from '../api/types';

export function RoleChip({ role }: { role: Role }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center rounded-full bg-axa-primary px-2.5 py-0.5 text-[11px] font-semibold text-white">
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-teal-300 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">
      Supervisor
    </span>
  );
}
