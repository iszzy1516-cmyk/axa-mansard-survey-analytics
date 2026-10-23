import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, ChevronDown, Frown, Loader2, Meh, Smile } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DEFAULT_RANGE, getDashboard } from '../api';
import type { CustomerInfoRow, DashboardData } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { answerTone, Chip, dispositionTone } from '../components/Chips';
import { KpiCard } from '../components/KpiCard';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { TimeInput } from '../components/TimeInput';
import { formatNumber, formatTimeMs, toDateInputValue, toTimeInputValue } from '../utils/format';

const CHART_COLORS = { yes: '#16a34a', no: '#dc2626' };
const DONUT_COLORS = ['#16a34a', '#d97706', '#dc2626'];

function DateTimeField({
  label,
  date,
  time,
  onDate,
  onTime,
}: {
  label: string;
  date: string;
  time: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[13px] text-gray-600 focus-within:border-axa-primary focus-within:ring-1 focus-within:ring-axa-primary">
      <span className="whitespace-nowrap font-medium">{label}:</span>
      <CalendarDays size={14} className="shrink-0 text-gray-400" />
      <input
        type="date"
        value={date}
        onChange={(e) => onDate(e.target.value)}
        className="w-[7.2rem] bg-transparent text-gray-700 focus:outline-none"
      />
      <span className="text-gray-300">|</span>
      <TimeInput value={time} onChange={onTime} className="w-[4.6rem] bg-transparent text-gray-700 focus:outline-none" />
    </label>
  );
}

export function DashboardPage() {
  const { role, fullName } = useAuth();
  const isAdmin = role === 'admin';

  const [startDate, setStartDate] = useState(() => toDateInputValue(DEFAULT_RANGE.start));
  const [startTime, setStartTime] = useState(() => toTimeInputValue(DEFAULT_RANGE.start));
  const [endDate, setEndDate] = useState(() => toDateInputValue(DEFAULT_RANGE.end));
  const [endTime, setEndTime] = useState(() => toTimeInputValue(DEFAULT_RANGE.end));
  const [agent, setAgent] = useState<string>('all');

  const [applied, setApplied] = useState<{
    start: number;
    end: number;
    agent: string | null;
  }>({ start: DEFAULT_RANGE.start, end: DEFAULT_RANGE.end, agent: null });

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard(
      { start: applied.start, end: applied.end },
      role ?? 'supervisor',
      fullName,
      applied.agent,
    )
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applied, role, fullName]);

  const applyFilters = () => {
    const start = new Date(`${startDate}T${startTime}`).getTime();
    const end = new Date(`${endDate}T${endTime}`).getTime();
    setPage(1);
    setApplied({ start, end, agent: isAdmin && agent !== 'all' ? agent : null });
  };

  const resetFilters = () => {
    setStartDate(toDateInputValue(DEFAULT_RANGE.start));
    setStartTime(toTimeInputValue(DEFAULT_RANGE.start));
    setEndDate(toDateInputValue(DEFAULT_RANGE.end));
    setEndTime(toTimeInputValue(DEFAULT_RANGE.end));
    setAgent('all');
    setPage(1);
    setApplied({ start: DEFAULT_RANGE.start, end: DEFAULT_RANGE.end, agent: null });
  };

  const agents = useMemo(() => data?.agents ?? [], [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [] as CustomerInfoRow[];
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.customerRows.filter((r) =>
          [r.customerName, r.agent, r.agentEmail, r.phone, r.question]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : data.customerRows;
    return rows;
  }, [data, search]);

  const pagedRows = filteredRows.slice((page - 1) * perPage, page * perPage);

  const donutData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Positive', value: data.satisfaction.positive },
      { name: 'Neutral', value: data.satisfaction.neutral },
      { name: 'Negative', value: data.satisfaction.negative },
    ];
  }, [data]);

  const sentimentCards: Array<{
    label: string;
    icon: LucideIcon;
    color: string;
    count: number;
    pct: number;
    pctColor: string;
  }> = data
    ? [
        {
          label: 'Positive',
          icon: Smile,
          color: 'text-green-600',
          count: data.satisfaction.positive,
          pct: data.satisfaction.positivePct,
          pctColor: 'text-green-600',
        },
        {
          label: 'Neutral',
          icon: Meh,
          color: 'text-amber-500',
          count: data.satisfaction.neutral,
          pct: data.satisfaction.neutralPct,
          pctColor: 'text-amber-600',
        },
        {
          label: 'Negative',
          icon: Frown,
          color: 'text-red-600',
          count: data.satisfaction.negative,
          pct: data.satisfaction.negativePct,
          pctColor: 'text-red-600',
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <DateTimeField
          label="Start"
          date={startDate}
          time={startTime}
          onDate={setStartDate}
          onTime={setStartTime}
        />
        <DateTimeField
          label="End"
          date={endDate}
          time={endTime}
          onDate={setEndDate}
          onTime={setEndTime}
        />
        <div className="relative">
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            disabled={!isAdmin}
            className="input-base w-44 appearance-none pr-8 disabled:bg-gray-50 disabled:text-gray-400"
          >
            {isAdmin ? (
              <>
                <option value="all">Agent: All agents</option>
                {agents.map((a) => (
                  <option key={a} value={a}>
                    Agent: {a}
                  </option>
                ))}
              </>
            ) : (
              <option value="all">Agent: My team</option>
            )}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
        <button type="button" onClick={applyFilters} className="btn-primary">
          Apply
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="text-[13px] font-medium text-axa-primary hover:underline"
        >
          Reset filters
        </button>
        {loading && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>

      {data && (
        <>
          {/* Call Outcomes */}
          <section>
            <h2 className="mb-2.5 text-sm font-semibold text-gray-800">Call Outcomes</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.kpis.map((k) => (
                <KpiCard key={k.key} kpi={k} />
              ))}
            </div>
          </section>

          {/* Yes / No Responses chart */}
          <section className="card px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-800">Yes / No Responses</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Grouped by day · reflects the selected date &amp; time range
            </p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.yesNoByDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="yes" name="Yes" fill={CHART_COLORS.yes} radius={[2, 2, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="no" name="No" fill={CHART_COLORS.no} radius={[2, 2, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Yes/No with Customer Information */}
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
              <h2 className="text-sm font-semibold text-gray-800">
                Yes/No with Customer Information
              </h2>
              <div className="flex items-center gap-3">
                <SearchInput
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="Search customer, agent..."
                  className="w-64"
                />
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
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
                  <span>per page (10/25/50)</span>
                </div>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-gray-100 bg-gray-50/60">
                  <tr>
                    <th className="th-cell">Time</th>
                    <th className="th-cell">Phone / Customer ID</th>
                    <th className="th-cell">Customer Name</th>
                    <th className="th-cell">Agent</th>
                    <th className="th-cell">Agent Email</th>
                    <th className="th-cell">Question</th>
                    <th className="th-cell">Answer</th>
                    <th className="th-cell">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="td-cell">{formatTimeMs(r.time)}</td>
                      <td className="td-cell">{r.phone}</td>
                      <td className="td-cell">{r.customerName}</td>
                      <td className="td-cell">{r.agent}</td>
                      <td className="td-cell text-gray-500">{r.agentEmail}</td>
                      <td className="td-cell">{r.question}</td>
                      <td className="td-cell">
                        <Chip tone={answerTone(r.answer)}>{r.answer ?? '—'}</Chip>
                      </td>
                      <td className="td-cell">
                        <Chip tone={dispositionTone(r.outcome)}>{r.outcome}</Chip>
                      </td>
                    </tr>
                  ))}
                  {pagedRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                        No matching records for the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              perPage={perPage}
              total={filteredRows.length}
              onPageChange={setPage}
            />
          </section>

          {/* Overall Agent Satisfaction */}
          <section>
            <h2 className="mb-2.5 text-sm font-semibold text-gray-800">
              Overall Agent Satisfaction
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sentimentCards.map((c) => (
                <div key={c.label} className="card flex items-center gap-4 px-5 py-4">
                  <c.icon size={36} strokeWidth={1.6} className={c.color} />
                  <div>
                    <p className="text-[13px] text-gray-500">{c.label}</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatNumber(c.count)}
                    </p>
                    <p className={`text-xs font-medium ${c.pctColor}`}>{c.pct}% of rated calls</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="card mt-4 flex flex-col items-start gap-6 px-5 py-5 md:flex-row md:items-center">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {donutData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={DONUT_COLORS[['Positive', 'Neutral', 'Negative'].indexOf(entry.name)]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <ul className="mb-2 space-y-1 text-[13px] text-gray-600">
                  {['Positive', 'Neutral', 'Negative'].map((name, i) => (
                    <li key={name} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: DONUT_COLORS[i] }}
                      />
                      {name}
                    </li>
                  ))}
                </ul>
                <p className="text-[13px] font-semibold text-gray-800">
                  Sentiment split across all rated survey calls.
                </p>
                <p className="mt-1 max-w-2xl text-[13px] text-gray-500">
                  {data.satisfaction.narrative}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
