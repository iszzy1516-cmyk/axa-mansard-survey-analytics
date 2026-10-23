import { apiFetch } from './client';
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
export const USE_MOCK = true;

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
    const res = await fetch(`${(import.meta.env.VITE_API_BASE as string | undefined) ?? '/api'}/auth/login`, {
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

export function getReportRows(params: {
  reportType: ReportType;
  range: DateRange;
  role: Role;
  fullName: string;
}): ReportRow[] {
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

export { DEFAULT_RANGE, generatePassphrase, mockAgents };
