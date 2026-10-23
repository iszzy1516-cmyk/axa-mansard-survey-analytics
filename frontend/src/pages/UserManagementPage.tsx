import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Info, MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { createUser, deleteUser, generatePassphrase, listUsers } from '../api';
import type { AppUser, Role } from '../api/types';
import { Modal } from '../components/Modal';
import { SearchInput } from '../components/SearchInput';
import { RoleChip } from '../components/RoleChip';

export function UserManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    listUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.username, u.email, u.phone, u.firstName, u.lastName, u.role]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [users, search]);

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
          className="w-72"
        />
        <button type="button" onClick={() => setCreateOpen(true)} className="btn-primary">
          + Create User
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr>
                <th className="th-cell">Id</th>
                <th className="th-cell">User</th>
                <th className="th-cell">Email</th>
                <th className="th-cell">Phone</th>
                <th className="th-cell">First Name</th>
                <th className="th-cell">Last Name</th>
                <th className="th-cell">Role</th>
                <th className="th-cell text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="td-cell">{String(u.id).padStart(3, '0')}</td>
                  <td className="td-cell font-medium text-gray-800">{u.username}</td>
                  <td className="td-cell">{u.email}</td>
                  <td className="td-cell">{u.phone}</td>
                  <td className="td-cell">{u.firstName}</td>
                  <td className="td-cell">{u.lastName}</td>
                  <td className="td-cell">
                    {u.role === 'admin' ? (
                      <RoleChip role="admin" />
                    ) : (
                      <span className="text-[13px] text-gray-500">Supervisor</span>
                    )}
                  </td>
                  <td className="td-cell">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${u.username}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`More actions for ${u.username}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${u.username}`}
                        onClick={() => setDeleteTarget(u)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <Info size={13} />
            Supervisors can view the dashboard and export reports; only admins can manage users.
          </p>
          <span className="text-xs text-gray-500">{users.length} users</span>
        </div>
      </div>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(u) => {
          setUsers((prev) => [...prev, u].sort((a, b) => a.id - b.id));
          setCreateOpen(false);
        }}
      />

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete this user?">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Trash2 size={17} />
          </span>
          <p className="text-sm leading-relaxed text-gray-600">
            <span className="font-medium text-gray-800">{deleteTarget?.username}</span> (
            {deleteTarget?.firstName} {deleteTarget?.lastName}) will lose access immediately. This
            action cannot be undone.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" onClick={() => setDeleteTarget(null)} className="btn-outline">
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete user
          </button>
        </div>
      </Modal>
    </div>
  );
}

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (user: AppUser) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('supervisor');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setRole('supervisor');
      setPassword('');
      setError(null);
    }
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const user = await createUser({ firstName, lastName, email, phone, role, password });
      onCreated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create User" subtitle="New accounts receive a sign-in link by email." wide>
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
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" placeholder="name@axamansard.com" required />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-base" placeholder="+234 803 000 1122" />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input-base">
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-gray-700">Password</label>
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} className="input-base" required />
            <button
              type="button"
              onClick={() => setPassword(generatePassphrase())}
              className="btn-outline shrink-0 px-3"
              title="Generate a passphrase"
            >
              <RefreshCw size={13} />
              Generate
            </button>
          </div>
        </div>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
        )}
        <div className="flex justify-end gap-2.5 pt-1">
          <button type="button" onClick={onClose} className="btn-outline">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary min-w-28">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
