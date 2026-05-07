'use client';

import { useState } from 'react';
import { Artifact } from '@/lib/types';
import ChartView from './ChartView';

interface ArtifactPanelProps {
  artifacts: Artifact[];
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function parseMarkdownTable(text: string): ParsedTable | null {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'));

  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const headers = parseRow(lines[0]);
  // Line index 1 is the separator (|---|---|). Skip it.
  const rows = lines.slice(2).map(parseRow);

  return { headers, rows };
}

function stripMarkdownInline(cell: string): string {
  // Strip **bold**, __bold__, *italic*, _italic_, and surrounding whitespace.
  return cell
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (cell: string) => {
    const cleaned = stripMarkdownInline(cell);
    if (/[,"\n]/.test(cleaned)) {
      return `"${cleaned.replace(/"/g, '""')}"`;
    }
    return cleaned;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ArtifactPanel({
  artifacts,
  isOpen,
  onClose,
}: ArtifactPanelProps) {
  if (!isOpen || artifacts.length === 0) return null;

  return (
    <aside
      className="fixed right-0 top-0 h-screen w-2/5 bg-white shadow-lg overflow-y-auto z-50 border-l"
      style={{ borderColor: 'var(--amika-gray-light)' }}
      aria-label="Artifacts panel"
    >
      <header
        className="p-4 border-b flex justify-between items-center"
        style={{ borderColor: 'var(--amika-gray-light)' }}
      >
        <h2 className="text-xl font-bold">Artifacts</h2>
        <button
          onClick={onClose}
          aria-label="Close artifacts panel"
          className="text-2xl leading-none px-2"
        >
          &times;
        </button>
      </header>

      <div className="p-4 space-y-4">
        {artifacts.map((artifact) => (
          <ArtifactCard key={artifact.id} artifact={artifact} />
        ))}
      </div>
    </aside>
  );
}

function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const parsedTable =
    artifact.type === 'data' ? parseMarkdownTable(artifact.content) : null;

  return (
    <div
      className="border rounded-lg p-4"
      style={{ borderColor: 'var(--amika-gray-light)' }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{artifact.title ?? artifact.type}</h3>
        {artifact.language && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--amika-gray-light)',
              color: 'var(--amika-gray-text)',
            }}
          >
            {artifact.language}
          </span>
        )}
      </div>

      {parsedTable ? (
        <DataTableView table={parsedTable} title={artifact.title ?? 'data'} />
      ) : (
        <CodeView content={artifact.content} language={artifact.language} />
      )}
    </div>
  );
}

function DataTableView({ table, title }: { table: ParsedTable; title: string }) {
  const csv = toCSV(table.headers, table.rows);
  const safeTitle = title.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'export';
  const filename = `${safeTitle}.csv`;
  const [showChart, setShowChart] = useState(false);

  return (
    <>
      {showChart && (
        <div className="mb-3">
          <ChartView headers={table.headers} rows={table.rows} />
        </div>
      )}
      <div className="overflow-x-auto rounded border" style={{ borderColor: 'var(--amika-gray-light)' }}>
        <table className="min-w-full text-sm">
          <thead style={{ backgroundColor: 'var(--amika-gray-light)' }}>
            <tr>
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                >
                  {stripMarkdownInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr
                key={ri}
                className="border-t"
                style={{ borderColor: 'var(--amika-gray-light)' }}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 align-top whitespace-nowrap"
                  >
                    {stripMarkdownInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button
          onClick={() => setShowChart((v) => !v)}
          className="text-sm px-3 py-1 rounded border"
          style={{
            borderColor: 'var(--amika-orange)',
            color: showChart ? 'white' : 'var(--amika-orange)',
            backgroundColor: showChart ? 'var(--amika-orange)' : 'transparent',
          }}
        >
          {showChart ? 'Hide chart' : 'Visualize'}
        </button>
        <button
          onClick={() => void navigator.clipboard.writeText(csv)}
          className="text-sm px-3 py-1 rounded text-white"
          style={{ backgroundColor: 'var(--amika-orange)' }}
        >
          Copy CSV
        </button>
        <button
          onClick={() => downloadCSV(filename, csv)}
          className="text-sm px-3 py-1 rounded border"
          style={{
            borderColor: 'var(--amika-orange)',
            color: 'var(--amika-orange)',
          }}
        >
          Download .csv
        </button>
        <span className="text-xs self-center" style={{ color: 'var(--amika-gray-text)' }}>
          {table.rows.length} rows
        </span>
      </div>
    </>
  );
}

function CodeView({
  content,
  language,
}: {
  content: string;
  language?: string;
}) {
  return (
    <>
      <pre
        className="rounded p-3 text-sm overflow-x-auto whitespace-pre-wrap"
        style={{ backgroundColor: 'var(--amika-gray-light)' }}
      >
        <code className={language ? `language-${language}` : ''}>{content}</code>
      </pre>
      <button
        onClick={() => void navigator.clipboard.writeText(content)}
        className="mt-2 text-sm px-3 py-1 rounded text-white"
        style={{ backgroundColor: 'var(--amika-orange)' }}
      >
        Copy
      </button>
    </>
  );
}
