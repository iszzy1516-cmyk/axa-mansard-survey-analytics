import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Info } from 'lucide-react';
import { changePassword, getSchedule, saveSchedule, signOutAll } from '../api';
import type { ScheduleInput } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Modal } from '../components/Modal';
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

const FREQUENCY_TO_CLOCK: Record<ScheduleInput['frequency'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const CLOCK_TO_FREQUENCY: Record<string, ScheduleInput['frequency']> = {
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
};

function clockTo24h(clock: string): string {
  const m = clock.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return '08:00';
  let h = Number(m[1]);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function h24ToClock(hhmm: string): string {
  let h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export function SettingsPage() {
  const { fullName, email, role, logout } = useAuth();
  const isAdmin = role === 'admin';
  const navigate = useNavigate();

  // Profile
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Report schedule
  const [frequency, setFrequency] = useState('Weekly');
  const [deliveryTime, setDeliveryTime] = useState('08:00 AM');
  const [excelFormat, setExcelFormat] = useState(true);
  const [csvFormat, setCsvFormat] = useState(true);
  const [recipients, setRecipients] = useState(email);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSchedule()
      .then((s) => {
        if (cancelled || !s) return;
        setFrequency(FREQUENCY_TO_CLOCK[s.frequency] ?? 'Weekly');
        setDeliveryTime(h24ToClock(s.deliveryTime));
        setExcelFormat(s.formatExcel);
        setCsvFormat(s.formatCsv);
        setRecipients(s.recipients);
      })
      .catch(() => {
        // No saved schedule yet — keep the defaults.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timeout, setTimeoutValue] = useState('30 minutes of inactivity');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const onSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    setScheduleError(null);
    try {
      await saveSchedule({
        frequency: CLOCK_TO_FREQUENCY[frequency] ?? 'weekly',
        deliveryTime: clockTo24h(deliveryTime),
        formatExcel: excelFormat,
        formatCsv: csvFormat,
        recipients,
      });
      setScheduleSaved(true);
      window.setTimeout(() => setScheduleSaved(false), 6000);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const onUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      // The API invalidates every session, including this one — sign out.
      setPasswordMessage(null);
      logout();
      navigate('/login', {
        state: { notice: 'Password updated. Please sign in again with your new password.' },
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Password change failed');
    }
  };

  const onSignOutAll = async () => {
    setConfirmSignOut(false);
    try {
      await signOutAll();
    } finally {
      logout();
      navigate('/login', { state: { notice: 'Signed out of all devices.' } });
    }
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
          <button type="button" onClick={() => setProfileOpen(true)} className="btn-outline mt-5 w-full">
            Edit profile
          </button>
          {profileMessage && <p className="mt-3 text-xs text-green-600">{profileMessage}</p>}
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
            {scheduleError && <p className="text-[13px] text-red-600">{scheduleError}</p>}
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
            {passwordError && <p className="text-[13px] text-red-600">{passwordError}</p>}
            {passwordMessage && <p className="text-[13px] text-green-600">{passwordMessage}</p>}
            <button type="submit" className="btn-outline w-full">
              Update password
            </button>
          </form>
          {confirmSignOut ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onSignOutAll}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-red-700"
              >
                Sign out everywhere
              </button>
              <button
                type="button"
                onClick={() => setConfirmSignOut(false)}
                className="text-[13px] font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="mt-3 text-[13px] font-medium text-axa-red hover:underline"
            >
              Sign out of all devices
            </button>
          )}
        </div>
      </div>

      <EditProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={() => {
          setProfileOpen(false);
          setProfileMessage('Profile updated.');
          window.setTimeout(() => setProfileMessage(null), 5000);
        }}
      />
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { fullName, email, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const parts = fullName.trim().split(/\s+/);
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' '));
      setEmailValue(email);
      setPhone('+234 801 234 5678');
      setError(null);
    }
  }, [open, fullName, email]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ firstName, lastName, email: emailValue, phone });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit User" subtitle="Update your profile details." wide>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">First Name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input-base" required />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Last Name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="input-base" required />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            className="input-base"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-base" />
        </div>
        <p className="text-xs text-gray-400">Role can only be changed by an administrator.</p>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2.5 pt-1">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary min-w-28">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
