import { useState } from 'react';
import type { FormEvent } from 'react';
import { Clock3, Info } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { RoleChip } from '../components/RoleChip';
import { initials } from '../utils/format';

const TIME_OPTIONS = [
  '06:00 AM',
  '07:00 AM',
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '05:00 PM',
  '06:00 PM',
];

export function SettingsPage() {
  const { fullName, email, role, logout } = useAuth();
  const isAdmin = role === 'admin';

  const [frequency, setFrequency] = useState('Weekly');
  const [deliveryTime, setDeliveryTime] = useState('08:00 AM');
  const [excelFormat, setExcelFormat] = useState(true);
  const [csvFormat, setCsvFormat] = useState(true);
  const [recipients, setRecipients] = useState(email);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timeout, setTimeoutValue] = useState('30 minutes of inactivity');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const onSaveSchedule = (e: FormEvent) => {
    e.preventDefault();
    setScheduleSaved(true);
    window.setTimeout(() => setScheduleSaved(false), 4000);
  };

  const onUpdatePassword = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match.');
      return;
    }
    setPasswordMessage('Password updated.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const rows = [
    { label: 'Phone', value: '+234 801 234 5678' },
    { label: 'Team', value: 'CX Surveys' },
    { label: 'Timezone', value: 'Africa/Lagos (WAT)' },
    { label: 'Member since', value: 'Mar 2024' },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Profile, report delivery and security preferences
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        {/* Profile */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800">Profile</h3>
          <div className="mt-4 flex items-center gap-3.5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-axa-primary text-lg font-semibold text-white">
              {initials(fullName) || 'U'}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-gray-900">{fullName}</p>
              <p className="text-[13px] text-gray-500">{email}</p>
              <div className="mt-1">
                <RoleChip role={isAdmin ? 'admin' : 'supervisor'} />
              </div>
            </div>
          </div>
          <dl className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between text-[13px]">
                <dt className="text-gray-400">{r.label}</dt>
                <dd className="text-gray-700">{r.value}</dd>
              </div>
            ))}
          </dl>
          <button type="button" className="btn-outline mt-5 w-full">
            Edit profile
          </button>
          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            Both admins and supervisors see this page. The Users menu is visible to admins only.
          </p>
        </div>

        {/* Report Schedule */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800">Report Schedule</h3>
          <p className="mt-0.5 text-xs text-gray-400">Scheduled report delivery — per user</p>
          <form onSubmit={onSaveSchedule} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="input-base">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Delivery time</label>
              <div className="relative">
                <Clock3 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="input-base pl-9">
                  {TIME_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Format</span>
              <div className="flex gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={excelFormat}
                    onChange={(e) => setExcelFormat(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-axa-primary focus:ring-axa-primary"
                  />
                  Excel (.xlsx)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-600">
                  <input
                    type="checkbox"
                    checked={csvFormat}
                    onChange={(e) => setCsvFormat(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-axa-primary focus:ring-axa-primary"
                  />
                  CSV
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Email recipients
              </label>
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                className="input-base"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Save schedule
            </button>
          </form>
          {scheduleSaved && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md bg-blue-50 px-3.5 py-3">
              <Info size={15} className="mt-0.5 shrink-0 text-axa-primary" />
              <p className="text-[13px] text-axa-primary">
                Your report will be generated automatically and sent to the email(s) above.
              </p>
            </div>
          )}
        </div>

        {/* Security */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800">Security</h3>
          <form onSubmit={onUpdatePassword} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-base"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-base"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-base"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-gray-700">
                Session timeout
              </label>
              <select value={timeout} onChange={(e) => setTimeoutValue(e.target.value)} className="input-base">
                <option>15 minutes of inactivity</option>
                <option>30 minutes of inactivity</option>
                <option>1 hour of inactivity</option>
                <option>8 hours of inactivity</option>
              </select>
            </div>
            {passwordMessage && (
              <p
                className={`text-[13px] ${
                  passwordMessage === 'Password updated.' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {passwordMessage}
              </p>
            )}
            <button type="submit" className="btn-outline w-full">
              Update password
            </button>
          </form>
          <button
            type="button"
            onClick={logout}
            className="mt-3 text-[13px] font-medium text-axa-red hover:underline"
          >
            Sign out of all devices
          </button>
        </div>
      </div>
    </div>
  );
}
