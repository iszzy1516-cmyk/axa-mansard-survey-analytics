import type {
  AppUser,
  CustomerInfoRow,
  DashboardData,
  DateRange,
  FilteredRequestRow,
  Kpi,
  ReportResult,
  ReportRow,
  ReportType,
  Role,
  SatisfactionSummary,
  SurveyRequestDetailRow,
  SurveyRequestRow,
  SurveyResponseRow,
  YesNoDayRow,
} from './types';
import { formatDelta } from '../utils/format';

// ---------------------------------------------------------------------------
// Seeded pseudo-random generation so the mock data is stable between reloads.
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Agent {
  name: string;
  email: string;
  supervisor: string;
}

const AGENTS: Agent[] = [
  { name: 'Aisha Yusuf', email: 'a.yusuf@axamansard.com', supervisor: 'David Okafor' },
  { name: 'Musa Bello', email: 'm.bello@axamansard.com', supervisor: 'David Okafor' },
  { name: 'Sade Okafor', email: 's.okafor@axamansard.com', supervisor: 'Fatima Adamu' },
  { name: 'Funke Adeyemi', email: 'f.adeyemi@axamansard.com', supervisor: 'David Okafor' },
  { name: 'Ibrahim Musa', email: 'i.musa@axamansard.com', supervisor: 'Fatima Adamu' },
  { name: 'Ngozi Eze', email: 'n.eze@axamansard.com', supervisor: 'David Okafor' },
  { name: 'Tunde Bakare', email: 't.bakare@axamansard.com', supervisor: 'Fatima Adamu' },
];

/** Supervisors only ever see the agents in their own team. */
const SUPERVISOR_TEAMS: Record<string, string[]> = {
  'Aisha Yusuf': ['Musa Bello', 'Sade Okafor', 'Funke Adeyemi'],
  'David Okafor': AGENTS.map((a) => a.name),
  'Fatima Adamu': AGENTS.map((a) => a.name),
};

const CUSTOMER_NAMES = [
  'Adeze Obi',
  'Chidi Nwosu',
  'Funke Adeyemi',
  'Ibrahim Musa',
  'Ngozi Eze',
  'Tunde Bakare',
  'Kemi Adebayo',
  'Chinedu Eze',
  'Halima Sule',
  'Emeka Obi',
  'Bola Adeyemi',
  'Yusuf Garba',
  'Amara Okafor',
  'Segun Balogun',
  'Nneka Umeh',
  'Danjuma Bello',
  'Tolu Alabi',
  'Uche Nnamdi',
  'Zainab Lawal',
  'Femi Ogunleye',
];

const QUESTIONS = [
  'Renewal reminder confirmed?',
  'Satisfied with claims process?',
  'Interested in motor add-on?',
  'Policy document received?',
  'Would you recommend AXA Mansard?',
  'Satisfied with agent handling?',
];

const PHONE_POOL = [
  '+2348012345678',
  '+2348098765432',
  '+2347055512345',
  '+2349022233445',
  '+2348156677889',
  '+2347033344556',
  '+2349077788890',
  '+2348122233445',
  '+2348065544332',
  '+2349011122233',
  '+2348134455667',
  '+2347089900112',
  '+2349056677889',
  '+2348023344556',
  '+2348112233445',
  '+2347078899001',
];

const SKILLSETS = ['Health', 'Health', 'Health', 'Health', 'Health', 'Retention', 'Claims', 'Motor'];

interface CallEvent {
  id: number;
  insertedAt: number;
  phone: string;
  customerName: string;
  skillset: string;
  agent: Agent;
  selection: 'Yes' | 'No' | null;
  disposition: 'RL' | 'AB' | 'OTHER';
  rating: number | null;
  question: string;
}

// The fixed demo window: 01 Oct 2026 9:00 AM – 21 Oct 2026 5:00 PM.
const WINDOW_START = new Date(2026, 9, 1, 9, 0, 0, 0).getTime();
const WINDOW_END = new Date(2026, 9, 21, 17, 0, 0, 0).getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function buildEvents(): CallEvent[] {
  const rand = mulberry32(20261021);
  const events: CallEvent[] = [];
  // 21 days of history before the demo window (for "previous period" deltas)
  // plus the 21 demo days themselves.
  let id = 1;
  for (let day = -21; day < 21; day++) {
    const dayStart = WINDOW_START + day * MS_PER_DAY;
    const count = 560 + Math.floor(rand() * 90);
    for (let i = 0; i < count; i++) {
      const insertedAt = dayStart + Math.floor(rand() * 8 * 60 * 60 * 1000);
      if (insertedAt > WINDOW_END) continue;
      const agent = AGENTS[Math.floor(rand() * AGENTS.length)];
      // ~67% released (RL), ~9.5% abandoned (AB), rest not attempted — mirroring
      // the real mix where Total Calls > RL + AB.
      const roll = rand();
      const disposition: 'RL' | 'AB' | 'OTHER' =
        roll < 0.667 ? 'RL' : roll < 0.762 ? 'AB' : 'OTHER';
      const selection: 'Yes' | 'No' | null =
        disposition === 'RL' ? (rand() < 0.685 ? 'Yes' : 'No') : null;
      let rating: number | null = null;
      if (selection === 'Yes') {
        rating = rand() < 0.62 ? 5 : rand() < 0.75 ? 4 : 3;
      } else if (selection === 'No') {
        rating = rand() < 0.35 ? 3 : rand() < 0.7 ? 2 : 1;
      }
      events.push({
        id: id++,
        insertedAt,
        phone: PHONE_POOL[Math.floor(rand() * PHONE_POOL.length)],
        customerName: CUSTOMER_NAMES[Math.floor(rand() * CUSTOMER_NAMES.length)],
        skillset: SKILLSETS[Math.floor(rand() * SKILLSETS.length)],
        agent,
        selection,
        disposition,
        rating,
        question: QUESTIONS[Math.floor(rand() * QUESTIONS.length)],
      });
    }
  }
  return events.sort((a, b) => b.insertedAt - a.insertedAt);
}

const EVENTS = buildEvents();

export const DEFAULT_RANGE: DateRange = { start: WINDOW_START, end: WINDOW_END };

export function mockAgents(): string[] {
  return AGENTS.map((a) => a.name);
}

export function mockAgentEmail(agentName: string): string {
  return AGENTS.find((a) => a.name === agentName)?.email ?? '';
}

function teamFilter(role: Role, fullName: string): (e: CallEvent) => boolean {
  if (role === 'admin') return () => true;
  const team = SUPERVISOR_TEAMS[fullName] ?? [];
  return (e) => team.includes(e.agent.name);
}

function inRange(e: CallEvent, range: DateRange): boolean {
  return e.insertedAt >= range.start && e.insertedAt <= range.end;
}

// ---------------------------------------------------------------------------
// KPI + chart aggregation
// ---------------------------------------------------------------------------
function countKpis(rows: CallEvent[], prevRows: CallEvent[]): Kpi[] {
  const rl = rows.filter((r) => r.disposition === 'RL').length;
  const ab = rows.filter((r) => r.disposition === 'AB').length;
  const yes = rows.filter((r) => r.selection === 'Yes').length;
  const no = rows.filter((r) => r.selection === 'No').length;
  const total = rows.length;
  const rate = total > 0 ? ((yes + no) / total) * 100 : 0;

  const pRl = prevRows.filter((r) => r.disposition === 'RL').length;
  const pAb = prevRows.filter((r) => r.disposition === 'AB').length;
  const pYes = prevRows.filter((r) => r.selection === 'Yes').length;
  const pNo = prevRows.filter((r) => r.selection === 'No').length;
  const pTotal = prevRows.length;
  const pRate = pTotal > 0 ? ((pYes + pNo) / pTotal) * 100 : 0;

  const pctDelta = (cur: number, prev: number): number =>
    prev > 0 ? ((cur - prev) / prev) * 100 : 0;
  const ptsDelta = (cur: number, prev: number): number => cur - prev;

  return [
    {
      key: 'rl',
      label: 'RL — Release / Successful',
      value: rl.toLocaleString('en-US'),
      delta: pctDelta(rl, pRl),
      deltaLabel: `${formatDelta(pctDelta(rl, pRl))}% vs previous period`,
      tone: 'green',
      icon: 'phone',
    },
    {
      key: 'ab',
      label: 'AB — Abandon / No response',
      value: ab.toLocaleString('en-US'),
      delta: pctDelta(ab, pAb),
      deltaLabel: `${formatDelta(pctDelta(ab, pAb))}% vs previous period`,
      tone: 'red',
      icon: 'phoneOff',
    },
    {
      key: 'yes',
      label: 'Answered (Yes)',
      value: yes.toLocaleString('en-US'),
      delta: pctDelta(yes, pYes),
      deltaLabel: `${formatDelta(pctDelta(yes, pYes))}% vs previous period`,
      tone: 'blue',
      icon: 'check',
    },
    {
      key: 'no',
      label: 'Not Answered (No)',
      value: no.toLocaleString('en-US'),
      delta: pctDelta(no, pNo),
      deltaLabel: `${formatDelta(pctDelta(no, pNo))}% vs previous period`,
      tone: 'amber',
      icon: 'x',
    },
    {
      key: 'total',
      label: 'Total Calls',
      value: total.toLocaleString('en-US'),
      delta: pctDelta(total, pTotal),
      deltaLabel: `${formatDelta(pctDelta(total, pTotal))}% vs previous period`,
      tone: 'blue',
      icon: 'hash',
    },
    {
      key: 'rate',
      label: 'Response Rate',
      value: `${rate.toFixed(1)}%`,
      delta: ptsDelta(rate, pRate),
      deltaLabel: `${formatDelta(ptsDelta(rate, pRate))} pts vs previous period`,
      tone: 'green',
      icon: 'percent',
    },
  ];
}

function yesNoByDay(rows: CallEvent[]): YesNoDayRow[] {
  const buckets = new Map<string, { yes: number; no: number; ts: number }>();
  for (const r of rows) {
    const dayStart = new Date(r.insertedAt);
    dayStart.setHours(0, 0, 0, 0);
    const key = dayStart.toISOString();
    const b = buckets.get(key) ?? { yes: 0, no: 0, ts: dayStart.getTime() };
    if (r.selection === 'Yes') b.yes += 1;
    if (r.selection === 'No') b.no += 1;
    buckets.set(key, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[1].ts - b[1].ts)
    .map(([key, b]) => {
      const d = new Date(key);
      return {
        day: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getDate()}`,
        yes: b.yes,
        no: b.no,
      };
    });
}

function satisfaction(rows: CallEvent[]): SatisfactionSummary {
  const rated = rows.filter((r) => r.rating !== null);
  const positive = rated.filter((r) => r.rating !== null && r.rating >= 4).length;
  const neutral = rated.filter((r) => r.rating === 3).length;
  const negative = rated.filter((r) => r.rating !== null && r.rating <= 2).length;
  const total = rated.length;
  const pct = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);
  return {
    positive,
    neutral,
    negative,
    ratedCalls: total,
    positivePct: pct(positive),
    neutralPct: pct(neutral),
    negativePct: pct(negative),
    narrative:
      'Positive sentiment rose 3.4 pts this period, driven by the claims follow-up campaign. ' +
      'Negative ratings remain concentrated in abandoned callbacks after 6 PM.',
  };
}

export function mockDashboard(
  range: DateRange,
  role: Role,
  fullName: string,
  agent: string | null,
): DashboardData {
  const inTeam = teamFilter(role, fullName);
  const scoped = (r: DateRange) =>
    EVENTS.filter((e) => inRange(e, r) && inTeam(e) && (agent === null || e.agent.name === agent));
  const rows = scoped(range);
  const span = range.end - range.start;
  const prevRange: DateRange = { start: range.start - span, end: range.start };
  const prevRows = scoped(prevRange);

  const customerRows: CustomerInfoRow[] = rows
    .filter((e) => e.selection !== null)
    .map((e) => ({
      id: e.id,
      time: e.insertedAt,
      phone: e.phone,
      customerName: e.customerName,
      agent: e.agent.name,
      agentEmail: e.agent.email,
      question: e.question,
      answer: e.selection,
      outcome: e.disposition === 'AB' ? 'AB' : 'RL',
    }));

  return {
    kpis: countKpis(rows, prevRows),
    yesNoByDay: yesNoByDay(rows),
    customerRows,
    satisfaction: satisfaction(rows),
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function mockReport(params: {
  reportType: ReportType;
  range: DateRange;
  role: Role;
  fullName: string;
  search: string;
  page: number;
  perPage: number;
}): Promise<ReportResult> {
  await delay(250);
  const { reportType, range, role, fullName, search, page, perPage } = params;
  const inTeam = teamFilter(role, fullName);
  const events = EVENTS.filter((e) => inRange(e, range) && inTeam(e));

  let rows: ReportRow[];
  switch (reportType) {
    case 'survey-request-details':
      rows = events.map(
        (e): SurveyRequestDetailRow => ({
          insertedTime: e.insertedAt,
          phoneClid: e.phone,
          skillset: e.skillset,
          selection: e.selection,
          agent: e.agent.name,
          agentEmail: e.agent.email,
          supervisor: e.agent.supervisor,
          disposition: e.disposition,
        }),
      );
      break;
    case 'survey-requests':
      rows = events.map(
        (e): SurveyRequestRow => ({
          id: e.id,
          phoneClid: e.phone,
          skillset: e.skillset,
          customerSelection: e.selection,
          insertedTime: e.insertedAt,
        }),
      );
      break;
    case 'survey-responses':
      rows = events
        .filter((e) => e.rating !== null)
        .map(
          (e): SurveyResponseRow => ({
            id: e.id,
            phoneClid: e.phone,
            skillset: e.skillset,
            customerRating: e.rating ?? 0,
            insertedTime: e.insertedAt,
          }),
        );
      break;
    case 'filtered-requests':
      rows = events
        .filter((e) => e.disposition !== 'OTHER')
        .map(
          (e): FilteredRequestRow => ({
            sequenceId: 700000 + e.id,
            originator: e.phone,
            originatedStamp: e.insertedAt,
            finalDisposition: e.disposition === 'AB' ? 'AB' : 'RL',
          }),
        );
      break;
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)))
    : rows;

  const start = (page - 1) * perPage;
  return {
    reportType,
    rows: filtered.slice(start, start + perPage),
    total: filtered.length,
    rangeStart: range.start,
    rangeEnd: range.end,
  };
}

/** Full (unpaged, unsearched) rows for client-side CSV export. */
export function mockReportRows(params: {
  reportType: ReportType;
  range: DateRange;
  role: Role;
  fullName: string;
}): ReportRow[] {
  const { reportType, range, role, fullName } = params;
  const inTeam = teamFilter(role, fullName);
  const events = EVENTS.filter((e) => inRange(e, range) && inTeam(e));
  switch (reportType) {
    case 'survey-request-details':
      return events.map((e) => ({
        insertedTime: e.insertedAt,
        phoneClid: e.phone,
        skillset: e.skillset,
        selection: e.selection,
        agent: e.agent.name,
        agentEmail: e.agent.email,
        supervisor: e.agent.supervisor,
        disposition: e.disposition,
      }));
    case 'survey-requests':
      return events.map((e) => ({
        id: e.id,
        phoneClid: e.phone,
        skillset: e.skillset,
        customerSelection: e.selection,
        insertedTime: e.insertedAt,
      }));
    case 'survey-responses':
      return events
        .filter((e) => e.rating !== null)
        .map((e) => ({
          id: e.id,
          phoneClid: e.phone,
          skillset: e.skillset,
          customerRating: e.rating ?? 0,
          insertedTime: e.insertedAt,
        }));
    case 'filtered-requests':
      return events
        .filter((e) => e.disposition !== 'OTHER')
        .map((e) => ({
          sequenceId: 700000 + e.id,
          originator: e.phone,
          originatedStamp: e.insertedAt,
          finalDisposition: e.disposition === 'AB' ? ('AB' as const) : ('RL' as const),
        }));
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const SEED_USERS: AppUser[] = [
  { id: 1, username: 'd.okafor', email: 'd.okafor@axamansard.com', phone: '+2348012345678', firstName: 'David', lastName: 'Okafor', role: 'admin', createdAt: 'Mar 2024' },
  { id: 2, username: 'a.yusuf', email: 'a.yusuf@axamansard.com', phone: '+2348098765432', firstName: 'Aisha', lastName: 'Yusuf', role: 'supervisor', createdAt: 'Mar 2024' },
  { id: 3, username: 'm.bello', email: 'm.bello@axamansard.com', phone: '+2347055512345', firstName: 'Musa', lastName: 'Bello', role: 'supervisor', createdAt: 'Apr 2024' },
  { id: 4, username: 's.okafor', email: 's.okafor@axamansard.com', phone: '+2349022233445', firstName: 'Sade', lastName: 'Okafor', role: 'supervisor', createdAt: 'Apr 2024' },
  { id: 5, username: 'c.eze', email: 'c.eze@axamansard.com', phone: '+2348156677889', firstName: 'Chinedu', lastName: 'Eze', role: 'supervisor', createdAt: 'Jun 2024' },
  { id: 6, username: 'f.adam', email: 'f.adam@axamansard.com', phone: '+2347033344556', firstName: 'Fatima', lastName: 'Adamu', role: 'admin', createdAt: 'Aug 2024' },
  { id: 7, username: 't.bakare', email: 't.bakare@axamansard.com', phone: '+2349065544332', firstName: 'Tunde', lastName: 'Bakare', role: 'supervisor', createdAt: 'Oct 2024' },
];

let usersStore: AppUser[] = [...SEED_USERS];

export function mockListUsers(): AppUser[] {
  return [...usersStore].sort((a, b) => a.id - b.id);
}

export function mockCreateUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
}): AppUser {
  const local = input.email.split('@')[0].toLowerCase();
  const user: AppUser = {
    id: Math.max(0, ...usersStore.map((u) => u.id)) + 1,
    username: local,
    email: input.email.toLowerCase(),
    phone: input.phone,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    createdAt: 'Oct 2026',
  };
  usersStore = [...usersStore, user];
  return user;
}

export function mockDeleteUser(id: number): void {
  usersStore = usersStore.filter((u) => u.id !== id);
}

export function mockFindUser(usernameOrEmail: string): AppUser | undefined {
  const q = usernameOrEmail.trim().toLowerCase();
  return usersStore.find((u) => u.email.toLowerCase() === q || u.username === q);
}

export function generatePassphrase(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const pick = (pool: string, n: number): string =>
    Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]).join('');
  return `${pick(letters, 4)}-${pick(digits, 4)}-${pick(letters, 4)}`;
}
