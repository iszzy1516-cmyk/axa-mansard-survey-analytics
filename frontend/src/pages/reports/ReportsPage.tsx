import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  FileBarChart2,
  FileSpreadsheet,
  FolderOpen,
  Inbox,
  Loader2,
} from 'lucide-react';
import { DEFAULT_RANGE, getReport, getReportRows } from '../../api';
import type {
  FilteredRequestRow,
  ReportResult,
  ReportRow,
  ReportType,
  SurveyRequestDetailRow,
  SurveyRequestRow,
  SurveyResponseRow,
} from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import {
  Chip,
  dispositionTone,
  ratingLabel,
  ratingTone,
} from '../../components/Chips';
import { Pagination } from '../../components/Pagination';
import { SearchInput } from '../../components/SearchInput';
import { downloadCsv } from '../../utils/csv';
import { formatRange, formatTimeShort, toDateInputValue, toTimeInputValue } from '../../utils/format';

const REPORT_TYPES: Array<{ type: ReportType; label: string; resultsName: string }> = [
  { type: 'survey-request-details', label: 'Survey Request Details', resultsName: 'Survey Request Details' },
  { type: 'survey-requests', label: 'Survey Requests', resultsName: 'Survey Requests' },
  { type: 'survey-responses', label: 'Survey Responses', resultsName: 'Survey Responses' },
  { type: 'filtered-requests', label: 'Filtered Requests', resultsName: 'Filtered Requests' },
];

const QUICK_RANGES = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'This Month'] as const;
type QuickRange = (typeof QUICK_RANGES)[number];

function quickRangeToDates(quick: QuickRange): { start: Date; end: Date } {
  const anchor = new Date(DEFAULT_RANGE.end); // 21 Oct 2026 5:00 PM — end of the demo data
  const end = new Date(anchor);
  const start = new Date(anchor);
  switch (quick) {
    case 'Today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'Yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'Last 7 Days':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'Last 30 Days':
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case 'This Month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

interface ColumnDef {
  header: string;
  render: (row: ReportRow) => React.ReactNode;
}

function columnsFor(type: ReportType): ColumnDef[] {
  switch (type) {
    case 'survey-request-details':
      return [
        { header: 'Inserted Time', render: (r) => <span>{formatTimeShort((r as SurveyRequestDetailRow).insertedTime)}</span> },
        { header: 'Phone CLID', render: (r) => <span>{(r as SurveyRequestDetailRow).phoneClid}</span> },
        { header: 'Skillset', render: (r) => <span>{(r as SurveyRequestDetailRow).skillset}</span> },
        {
          header: 'Selection',
          render: (r) => {
            const s = (r as SurveyRequestDetailRow).selection;
            return <Chip tone={s === 'Yes' ? 'green' : s === 'No' ? 'red' : 'neutral'}>{s ?? '—'}</Chip>;
          },
        },
        { header: 'Agent', render: (r) => <span>{(r as SurveyRequestDetailRow).agent}</span> },
        { header: 'Agent Email', render: (r) => <span className="text-gray-500">{(r as SurveyRequestDetailRow).agentEmail}</span> },
        { header: 'Supervisor', render: (r) => <span>{(r as SurveyRequestDetailRow).supervisor}</span> },
        {
          header: 'Disposition',
          render: (r) => {
            const d = (r as SurveyRequestDetailRow).disposition;
            return d === 'OTHER' ? (
              <Chip tone="neutral">—</Chip>
            ) : (
              <Chip tone={dispositionTone(d)}>{d}</Chip>
            );
          },
        },
      ];
    case 'survey-requests':
      return [
        { header: 'ID', render: (r) => <span>{(r as SurveyRequestRow).id}</span> },
        { header: 'Phone CLID', render: (r) => <span>{(r as SurveyRequestRow).phoneClid}</span> },
        { header: 'Skillset', render: (r) => <span>{(r as SurveyRequestRow).skillset}</span> },
        {
          header: 'Customer Selection',
          render: (r) => {
            const s = (r as SurveyRequestRow).customerSelection;
            return <Chip tone={s === 'Yes' ? 'green' : s === 'No' ? 'red' : 'neutral'}>{s ?? '—'}</Chip>;
          },
        },
        { header: 'Inserted Time', render: (r) => <span>{formatTimeShort((r as SurveyRequestRow).insertedTime)}</span> },
      ];
    case 'survey-responses':
      return [
        { header: 'ID', render: (r) => <span>{(r as SurveyResponseRow).id}</span> },
        { header: 'Phone CLID', render: (r) => <span>{(r as SurveyResponseRow).phoneClid}</span> },
        { header: 'Skillset', render: (r) => <span>{(r as SurveyResponseRow).skillset}</span> },
        {
          header: 'Customer Rating',
          render: (r) => {
            const rating = (r as SurveyResponseRow).customerRating;
            return <Chip tone={ratingTone(rating)}>{ratingLabel(rating)}</Chip>;
          },
        },
        { header: 'Inserted Time', render: (r) => <span>{formatTimeShort((r as SurveyResponseRow).insertedTime)}</span> },
      ];
    case 'filtered-requests':
      return [
        { header: 'Sequence ID', render: (r) => <span>{(r as FilteredRequestRow).sequenceId}</span> },
        { header: 'Originator', render: (r) => <span>{(r as FilteredRequestRow).originator}</span> },
        { header: 'Originated Stamp', render: (r) => <span>{formatTimeShort((r as FilteredRequestRow).originatedStamp)}</span> },
        {
          header: 'Final Disposition',
          render: (r) => {
            const d = (r as FilteredRequestRow).finalDisposition;
            return <Chip tone={dispositionTone(d)}>{d}</Chip>;
          },
        },
      ];
  }
}

function exportCsvFor(type: ReportType, rows: ReportRow[]): { headers: string[][]; body: string[][] } {
  const ts = (v: number): string => formatTimeShort(v);
  switch (type) {
    case 'survey-request-details':
      return {
        headers: [['Inserted Time', 'Phone CLID', 'Skillset', 'Selection', 'Agent', 'Agent Email', 'Supervisor', 'Disposition']],
        body: (rows as SurveyRequestDetailRow[]).map((r) => [
          ts(r.insertedTime), r.phoneClid, r.skillset, r.selection ?? '', r.agent, r.agentEmail, r.supervisor, r.disposition,
        ]),
      };
    case 'survey-requests':
      return {
        headers: [['ID', 'Phone CLID', 'Skillset', 'Customer Selection', 'Inserted Time']],
        body: (rows as SurveyRequestRow[]).map((r) => [
          String(r.id), r.phoneClid, r.skillset, r.customerSelection ?? '', ts(r.insertedTime),
        ]),
      };
    case 'survey-responses':
      return {
        headers: [['ID', 'Phone CLID', 'Skillset', 'Customer Rating', 'Inserted Time']],
        body: (rows as SurveyResponseRow[]).map((r) => [
          String(r.id), r.phoneClid, r.skillset, ratingLabel(r.customerRating), ts(r.insertedTime),
        ]),
      };
    case 'filtered-requests':
      return {
        headers: [['Sequence ID', 'Originator', 'Originated Stamp', 'Final Disposition']],
        body: (rows as FilteredRequestRow[]).map((r) => [
          String(r.sequenceId), r.originator, ts(r.originatedStamp), r.finalDisposition,
        ]),
      };
  }
}

function downloadExcel(type: ReportType, rows: ReportRow[], filename: string): void {
  const { headers, body } = exportCsvFor(type, rows);
  const esc = (v: string): string => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const table = [
    '<html><head><meta charset="UTF-8"></head><body><table>',
    ...headers.map((r) => `<tr>${r.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`),
    ...body.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`),
    '</table></body></html>',
  ].join('');
  const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function isReportType(v: string | undefined): v is ReportType {
  return REPORT_TYPES.some((r) => r.type === v);
}

export function ReportsPage() {
  const { reportType: reportTypeParam } = useParams();
  const navigate = useNavigate();
  const { role, fullName } = useAuth();
  const isAdmin = role === 'admin';
  const reportType: ReportType = isReportType(reportTypeParam)
    ? reportTypeParam
    : 'survey-request-details';
  const meta = REPORT_TYPES.find((r) => r.type === reportType)!;

  const [startDate, setStartDate] = useState(() => toDateInputValue(DEFAULT_RANGE.start));
  const [startTime, setStartTime] = useState(() => toTimeInputValue(DEFAULT_RANGE.start));
  const [endDate, setEndDate] = useState(() => toDateInputValue(DEFAULT_RANGE.end));
  const [endTime, setEndTime] = useState(() => toTimeInputValue(DEFAULT_RANGE.end));
  const [quick, setQuick] = useState<QuickRange | null>('Last 30 Days');

  const [applied, setApplied] = useState<{ start: number; end: number }>({
    start: DEFAULT_RANGE.start,
    end: DEFAULT_RANGE.end,
  });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchReport = useCallback(() => {
    setLoading(true);
    getReport({
      reportType,
      range: applied,
      role: role ?? 'supervisor',
      fullName,
      search,
      page,
      perPage,
    })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [reportType, applied, role, fullName, search, page, perPage]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const applyQuick = (q: QuickRange) => {
    const { start, end } = quickRangeToDates(q);
    setQuick(q);
    setStartDate(toDateInputValue(start.getTime()));
    setStartTime(toTimeInputValue(start.getTime()));
    setEndDate(toDateInputValue(end.getTime()));
    setEndTime(toTimeInputValue(end.getTime()));
  };

  const fetchWithRange = () => {
    const start = new Date(`${startDate}T${startTime}`).getTime();
    const end = new Date(`${endDate}T${endTime}`).getTime();
    setQuick(null);
    setPage(1);
    setApplied({ start, end });
  };

  const columns = useMemo(() => columnsFor(reportType), [reportType]);

  const doExport = async (kind: 'csv' | 'excel') => {
    const rows = await getReportRows({
      reportType,
      range: applied,
      role: role ?? 'supervisor',
      fullName,
    });
    const stamp = new Date(applied.start).toISOString().slice(0, 10);
    if (kind === 'csv') {
      const { headers, body } = exportCsvFor(reportType, rows);
      downloadCsv(`${reportType}-${stamp}.csv`, headers[0], body);
    } else {
      downloadExcel(reportType, rows, `${reportType}-${stamp}.xls`);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {isAdmin
            ? 'Select a date & time range to generate a report'
            : 'Choose a report type and a date & time range, then fetch results'}
        </p>
      </div>

      {/* Filters */}
      <div className="card space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              Start Date &amp; Time
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-600">
                <CalendarDays size={14} className="text-gray-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[7rem] bg-transparent focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-600">
                <Clock3 size={14} className="text-gray-400" />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-[5.4rem] bg-transparent focus:outline-none"
                />
              </label>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              End Date &amp; Time
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-600">
                <CalendarDays size={14} className="text-gray-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[7rem] bg-transparent focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[13px] text-gray-600">
                <Clock3 size={14} className="text-gray-400" />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-[5.4rem] bg-transparent focus:outline-none"
                />
              </label>
            </div>
          </div>

          {!isAdmin && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Report Type</label>
              <div className="relative">
                <FileBarChart2 size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={reportType}
                  onChange={(e) => navigate(`/reports/${e.target.value}`)}
                  className="input-base w-56 appearance-none pl-8 pr-8"
                >
                  {REPORT_TYPES.map((r) => (
                    <option key={r.type} value={r.type}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          )}

          <button type="button" onClick={fetchWithRange} className="btn-primary">
            {loading && <Loader2 size={15} className="animate-spin" />}
            Fetch Report
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-gray-500">Quick ranges</span>
          {QUICK_RANGES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => applyQuick(q)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                quick === q
                  ? 'border-axa-primary bg-blue-50 text-axa-primary'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Results — {meta.resultsName}
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {result ? (
                <>
                  {result.total.toLocaleString('en-US')} records ·{' '}
                  {formatRange(applied.start, applied.end)}
                </>
              ) : (
                'Select a range and fetch a report'
              )}
            </p>
          </div>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search results..."
            className="w-64"
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-gray-100 bg-gray-50/60">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} className="th-cell">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result?.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  {columns.map((c, j) => (
                    <td key={j} className="td-cell">
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {result && result.rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center">
                    <Inbox size={22} className="mx-auto text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No matching records</p>
                  </td>
                </tr>
              )}
              {!result && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-gray-400">
                    {loading ? 'Fetching…' : 'No report fetched yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {result && result.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              Items per page:
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="input-base w-auto px-1.5 py-1"
              >
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <Pagination page={page} perPage={perPage} total={result.total} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Exports */}
      <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-xs text-gray-400">
          Exports include every record in the selected range, not just this page.
          {!isAdmin && ' Only your team’s calls are included.'}
        </p>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => doExport('excel')}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-green-700"
          >
            <FileSpreadsheet size={15} />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => doExport('csv')}
            className="inline-flex items-center gap-1.5 rounded-md border border-green-600 bg-white px-3.5 py-2 text-[13px] font-medium text-green-700 hover:bg-green-50"
          >
            <FileBarChart2 size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Empty-state explainer */}
      {result && result.total === 0 && (
        <div className="card flex items-start gap-4 px-6 py-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <FolderOpen size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">No data for the selected range</p>
            <p className="mt-1 max-w-xl text-[13px] text-gray-500">
              When a range returns no calls, the table shows this empty state instead of stale
              results — try widening the range or clearing the agent filter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
