'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ChartType = 'bar' | 'pie' | 'line';

interface ChartViewProps {
  headers: string[];
  rows: string[][];
}

const CHART_COLORS = [
  '#FF6B35', // amika orange
  '#FF8FA3', // amika pink
  '#5C7CFA',
  '#51CF66',
  '#FCC419',
  '#845EF7',
  '#22B8CF',
  '#F783AC',
];

function stripMarkdownInline(cell: string): string {
  return cell
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

// Parse "$1,234.56", "1.2M", "85%", "(1,234)" etc into a number, or null if not numeric.
function parseNumeric(raw: string): number | null {
  const cleaned = stripMarkdownInline(raw);
  if (!cleaned || cleaned === '-' || cleaned === '—' || cleaned.toLowerCase() === 'n/a') {
    return null;
  }
  const negative = /^\(.*\)$/.test(cleaned);
  let s = cleaned.replace(/[(),$\s]/g, '');
  let multiplier = 1;
  if (/%$/.test(s)) {
    s = s.slice(0, -1);
  } else if (/[KkMmBb]$/.test(s)) {
    const suffix = s.slice(-1).toLowerCase();
    multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : 1_000_000_000;
    s = s.slice(0, -1);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return (negative ? -n : n) * multiplier;
}

function inferNumericColumns(headers: string[], rows: string[][]): number[] {
  const indexes: number[] = [];
  for (let c = 0; c < headers.length; c++) {
    let numeric = 0;
    let total = 0;
    for (const row of rows) {
      const cell = row[c];
      if (cell == null || stripMarkdownInline(cell) === '') continue;
      total += 1;
      if (parseNumeric(cell) !== null) numeric += 1;
    }
    if (total > 0 && numeric / total >= 0.6) indexes.push(c);
  }
  return indexes;
}

export default function ChartView({ headers, rows }: ChartViewProps) {
  const cleanHeaders = useMemo(() => headers.map(stripMarkdownInline), [headers]);
  const numericCols = useMemo(() => inferNumericColumns(headers, rows), [headers, rows]);
  const labelCandidates = useMemo(
    () => headers.map((_, i) => i).filter((i) => !numericCols.includes(i)),
    [headers, numericCols]
  );

  const defaultLabelCol = labelCandidates[0] ?? 0;
  const defaultValueCol = numericCols[0] ?? (headers.length > 1 ? 1 : 0);

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [labelCol, setLabelCol] = useState<number>(defaultLabelCol);
  const [valueCol, setValueCol] = useState<number>(defaultValueCol);

  const data = useMemo(() => {
    return rows
      .map((row) => {
        const label = stripMarkdownInline(row[labelCol] ?? '');
        const value = parseNumeric(row[valueCol] ?? '');
        return { label, value };
      })
      .filter((d) => d.label !== '' && d.value !== null) as Array<{
      label: string;
      value: number;
    }>;
  }, [rows, labelCol, valueCol]);

  if (numericCols.length === 0) {
    return (
      <div
        className="text-sm p-3 rounded"
        style={{
          backgroundColor: 'var(--amika-gray-light)',
          color: 'var(--amika-gray-text)',
        }}
      >
        No numeric columns detected — visualization needs at least one number column.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="text-sm p-3 rounded"
        style={{
          backgroundColor: 'var(--amika-gray-light)',
          color: 'var(--amika-gray-text)',
        }}
      >
        No rows with both a label and a numeric value.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <div className="flex gap-1">
          {(['bar', 'pie', 'line'] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className="px-2 py-1 rounded border capitalize"
              style={{
                borderColor:
                  chartType === type ? 'var(--amika-orange)' : 'var(--amika-gray-light)',
                backgroundColor:
                  chartType === type ? 'var(--amika-orange)' : 'white',
                color: chartType === type ? 'white' : 'var(--amika-gray-text)',
              }}
            >
              {type}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1">
          <span style={{ color: 'var(--amika-gray-text)' }}>Label:</span>
          <select
            value={labelCol}
            onChange={(e) => setLabelCol(Number(e.target.value))}
            className="border rounded px-1 py-0.5"
            style={{ borderColor: 'var(--amika-gray-light)' }}
          >
            {cleanHeaders.map((h, i) => (
              <option key={i} value={i}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span style={{ color: 'var(--amika-gray-text)' }}>Value:</span>
          <select
            value={valueCol}
            onChange={(e) => setValueCol(Number(e.target.value))}
            className="border rounded px-1 py-0.5"
            style={{ borderColor: 'var(--amika-gray-light)' }}
          >
            {numericCols.map((i) => (
              <option key={i} value={i}>
                {cleanHeaders[i]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLORS[0]} name={cleanHeaders[valueCol]} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                name={cleanHeaders[valueCol]}
                dot={{ r: 3 }}
              />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
