export type Role = 'admin' | 'supervisor';

export interface SessionUser {
  token: string;
  role: Role;
  fullName: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  full_name: string;
}

export interface Kpi {
  key: string;
  label: string;
  sublabel?: string;
  value: string;
  delta: number;
  deltaLabel: string;
  tone: 'green' | 'red' | 'blue' | 'amber';
  icon: 'phone' | 'phoneOff' | 'check' | 'x' | 'hash' | 'percent';
}

export interface YesNoDayRow {
  day: string;
  yes: number;
  no: number;
}

export interface CustomerInfoRow {
  id: number;
  time: number;
  phone: string;
  customerName: string;
  agent: string;
  agentEmail: string;
  question: string;
  answer: 'Yes' | 'No' | null;
  outcome: 'RL' | 'AB';
}

export interface SatisfactionSummary {
  positive: number;
  neutral: number;
  negative: number;
  ratedCalls: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  narrative: string;
}

export interface DashboardData {
  kpis: Kpi[];
  yesNoByDay: YesNoDayRow[];
  customerRows: CustomerInfoRow[];
  satisfaction: SatisfactionSummary;
  /** Agent full names for the filter dropdown (absent in older responses). */
  agents?: string[];
}

export type ReportType =
  | 'survey-request-details'
  | 'survey-requests'
  | 'survey-responses'
  | 'filtered-requests';

export interface SurveyRequestDetailRow {
  insertedTime: number;
  phoneClid: string;
  skillset: string;
  selection: 'Yes' | 'No' | null;
  agent: string;
  agentEmail: string;
  supervisor: string;
  disposition: 'RL' | 'AB' | 'OTHER';
}

export interface SurveyRequestRow {
  id: number;
  phoneClid: string;
  skillset: string;
  customerSelection: 'Yes' | 'No' | null;
  insertedTime: number;
}

export interface SurveyResponseRow {
  id: number;
  phoneClid: string;
  skillset: string;
  customerRating: number;
  insertedTime: number;
}

export interface FilteredRequestRow {
  sequenceId: number;
  originator: string;
  originatedStamp: number;
  finalDisposition: 'RL' | 'AB';
}

export type ReportRow =
  | SurveyRequestDetailRow
  | SurveyRequestRow
  | SurveyResponseRow
  | FilteredRequestRow;

export interface ReportResult {
  reportType: ReportType;
  rows: ReportRow[];
  total: number;
  rangeStart: number;
  rangeEnd: number;
}

export interface DateRange {
  start: number;
  end: number;
}

export interface AppUser {
  id: number;
  username: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}
