import { apiFetch, ApiError, BASE_URL } from './client';
import {
  DEFAULT_RANGE,
  generatePassphrase,
  mockAgents,
  mockCreateUser,
  mockDashboard,
  mockDeleteUser,
  mockFindUser,
  mockListUsers,
  mockReport,
  mockReportRows,
  mockUpdateUser,
} from './mock';
import type {
  AppUser,
  DashboardData,
  DateRange,
  LoginResponse,
  ReportResult,
  ReportRow,
  ReportType,
  Role,
} from './types';

/**
 * Single switch between the mock data layer and the real FastAPI backend.
 * When true, everything is served from mock.ts; when false, calls hit
 * /auth/login, /users, /dashboard/kpis and /reports/{type} (proxied to the
 * backend by the Vite dev server).
 */
export const USE_MOCK = false;

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface LoginInput {
  username: string;
  password: string;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  if (!USE_MOCK) {
    const form = new FormData();
    form.append('username', input.username);
    form.append('password', input.password);
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      let detail = 'Incorrect email or password';
      try {
        const data = (await res.json()) as { detail?: string };
        if (typeof data.detail === 'string') detail = data.detail;
      } catch {
        // keep default
      }
      throw new Error(detail);
    }
    return (await res.json()) as LoginResponse;
  }
  await delay(400);
  const user = mockFindUser(input.username);
  if (!user || input.password.length === 0) {
    throw new Error('Incorrect email or password');
  }
  return {
    access_token: `mock-token-${user.id}-${Date.now()}`,
    token_type: 'bearer',
    role: user.role,
    full_name: `${user.firstName} ${user.lastName}`,
  };
}

export async function getDashboard(
  range: DateRange,
  role: Role,
  fullName: string,
  agent: string | null,
): Promise<DashboardData> {
  if (!USE_MOCK) {
    const params = new URLSearchParams({
      start: new Date(range.start).toISOString(),
      end: new Date(range.end).toISOString(),
    });
    if (agent) params.set('agent', agent);
    return apiFetch<DashboardData>(`/dashboard/kpis?${params.toString()}`);
  }
  await delay(200);
  return mockDashboard(range, role, fullName, agent);
}

export async function getReport(params: {
  reportType: ReportType;
  range: DateRange;
  role: Role;
  fullName: string;
  search: string;
  page: number;
  perPage: number;
}): Promise<ReportResult> {
  if (!USE_MOCK) {
    const q = new URLSearchParams({
      start: new Date(params.range.start).toISOString(),
      end: new Date(params.range.end).toISOString(),
      search: params.search,
      page: String(params.page),
      per_page: String(params.perPage),
    });
    return apiFetch<ReportResult>(`/reports/${params.reportType}?${q.toString()}`);
  }
  return mockReport(params);
}

export async function getReportRows(params: {
  reportType: ReportType;
  range: DateRange;
  role: Role;
  fullName: string;
}): Promise<ReportRow[]> {
  if (!USE_MOCK) {
    // per_page=0 asks the backend for every matching row (for client-side export)
    const q = new URLSearchParams({
      start: new Date(params.range.start).toISOString(),
      end: new Date(params.range.end).toISOString(),
      page: '1',
      per_page: '0',
    });
    const res = await apiFetch<ReportResult>(`/reports/${params.reportType}?${q.toString()}`);
    return res.rows;
  }
  return mockReportRows(params);
}

export async function listUsers(): Promise<AppUser[]> {
  if (!USE_MOCK) {
    const rows = await apiFetch<
      Array<{
        id: number;
        email: string;
        role: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        is_active: boolean;
        created_at: string;
      }>
    >('/users');
    return rows.map((u) => ({
      id: u.id,
      username: u.email.split('@')[0],
      email: u.email,
      phone: u.phone ?? '',
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role as Role,
      createdAt: u.created_at,
    }));
  }
  await delay(200);
  return mockListUsers();
}

export async function createUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
}): Promise<AppUser> {
  if (!USE_MOCK) {
    await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        role: input.role,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
      }),
    });
    const users = await listUsers();
    const created = users.find((u) => u.email === input.email.toLowerCase());
    if (!created) throw new Error('User created but could not be reloaded');
    return created;
  }
  await delay(300);
  return mockCreateUser(input);
}

export async function deleteUser(id: number): Promise<void> {
  if (!USE_MOCK) {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    return;
  }
  await delay(200);
  mockDeleteUser(id);
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: Role;
  password?: string;
}

function mapUserOut(u: {
  id: number;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
}): AppUser {
  return {
    id: u.id,
    username: u.email.split('@')[0],
    email: u.email,
    phone: u.phone ?? '',
    firstName: u.first_name,
    lastName: u.last_name,
    role: u.role as Role,
    createdAt: u.created_at,
  };
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<AppUser> {
  if (!USE_MOCK) {
    const body: Record<string, string> = {};
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.email !== undefined) body.email = input.email;
    if (input.phone !== undefined) body.phone = input.phone;
    if (input.role !== undefined) body.role = input.role;
    if (input.password) body.password = input.password;
    const raw = await apiFetch<{
      id: number;
      email: string;
      role: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      created_at: string;
    }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    return mapUserOut(raw);
  }
  await delay(300);
  return mockUpdateUser(id, input);
}

export { DEFAULT_RANGE, generatePassphrase, mockAgents };

// ---------------------------------------------------------------------------
// Settings: profile, password, sessions, report schedule
// ---------------------------------------------------------------------------

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface ProfileInfo {
  email: string;
  role: Role;
  fullName: string;
}

export async function updateProfile(input: ProfileUpdateInput): Promise<ProfileInfo> {
  if (!USE_MOCK) {
    const body: Record<string, string> = {};
    if (input.firstName !== undefined) body.first_name = input.firstName;
    if (input.lastName !== undefined) body.last_name = input.lastName;
    if (input.email !== undefined) body.email = input.email;
    if (input.phone !== undefined) body.phone = input.phone;
    const raw = await apiFetch<{ email: string; role: Role; full_name: string }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return { email: raw.email, role: raw.role, fullName: raw.full_name };
  }
  await delay(300);
  const fullName = `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim() || 'User';
  return { email: input.email ?? 'user@axamansard.com', role: 'admin', fullName };
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!USE_MOCK) {
    await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return;
  }
  await delay(300);
  if (currentPassword.length === 0) throw new Error('Current password is incorrect');
}

export async function signOutAll(): Promise<void> {
  if (!USE_MOCK) {
    await apiFetch('/auth/sign-out-all', { method: 'POST' });
    return;
  }
  await delay(200);
}

export interface ScheduleInput {
  frequency: 'daily' | 'weekly' | 'monthly';
  deliveryTime: string;
  formatExcel: boolean;
  formatCsv: boolean;
  recipients: string;
}

export interface Schedule extends ScheduleInput {
  updatedAt: string;
}

const MOCK_SCHEDULE_KEY = 'axa_mock_schedule';

export async function getSchedule(): Promise<Schedule | null> {
  if (!USE_MOCK) {
    try {
      const s = await apiFetch<{
        frequency: 'daily' | 'weekly' | 'monthly';
        delivery_time: string;
        format_excel: boolean;
        format_csv: boolean;
        recipients: string;
        updated_at: string;
      }>('/auth/me/schedule');
      return {
        frequency: s.frequency,
        deliveryTime: s.delivery_time,
        formatExcel: s.format_excel,
        formatCsv: s.format_csv,
        recipients: s.recipients,
        updatedAt: s.updated_at,
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }
  await delay(150);
  const raw = localStorage.getItem(MOCK_SCHEDULE_KEY);
  return raw ? (JSON.parse(raw) as Schedule) : null;
}

export async function saveSchedule(input: ScheduleInput): Promise<Schedule> {
  if (!USE_MOCK) {
    const s = await apiFetch<{
      frequency: 'daily' | 'weekly' | 'monthly';
      delivery_time: string;
      format_excel: boolean;
      format_csv: boolean;
      recipients: string;
      updated_at: string;
    }>('/auth/me/schedule', {
      method: 'PUT',
      body: JSON.stringify({
        frequency: input.frequency,
        delivery_time: input.deliveryTime,
        format_excel: input.formatExcel,
        format_csv: input.formatCsv,
        recipients: input.recipients,
      }),
    });
    return {
      frequency: s.frequency,
      deliveryTime: s.delivery_time,
      formatExcel: s.format_excel,
      formatCsv: s.format_csv,
      recipients: s.recipients,
      updatedAt: s.updated_at,
    };
  }
  await delay(300);
  const schedule: Schedule = { ...input, updatedAt: new Date().toISOString() };
  localStorage.setItem(MOCK_SCHEDULE_KEY, JSON.stringify(schedule));
  return schedule;
}
