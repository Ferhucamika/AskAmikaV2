import { Artifact } from '@/lib/types';

const DATA_LANGUAGES = new Set(['json', 'csv', 'yaml', 'yml', 'toml', 'xml']);

const FENCE_REGEX = /```(\w+)?\n([\s\S]*?)\n```/g;
const TABLE_REGEX = /^(\|.+\|\n\|[-:|\s]+\|(?:\n\|.+\|)+)/m;

const MIN_CODE_LINES = 3;
const MIN_CODE_CHARS = 80;
const MIN_TABLE_DATA_ROWS = 2;

function isSubstantialBlock(content: string): boolean {
  const trimmed = content.trim();
  const lineCount = trimmed.split('\n').length;
  return lineCount >= MIN_CODE_LINES || trimmed.length >= MIN_CODE_CHARS;
}

function tableDataRowCount(table: string): number {
  // total rows minus 2 (header + separator)
  return table.trim().split('\n').length - 2;
}

export function detectArtifacts(text: string): Artifact[] {
  const artifacts: Artifact[] = [];

  let match: RegExpExecArray | null;
  while ((match = FENCE_REGEX.exec(text)) !== null) {
    const [, rawLang, content] = match;
    const language = rawLang || 'text';
    const isData = DATA_LANGUAGES.has(language.toLowerCase());

    // Always extract structured data (JSON/CSV/etc), even if short.
    // For code, only extract if it's substantial enough to warrant a side panel.
    if (!isData && !isSubstantialBlock(content)) continue;

    artifacts.push({
      id: `${isData ? 'data' : 'code'}-${artifacts.length}`,
      type: isData ? 'data' : 'code',
      language,
      content: content.trim(),
      title: isData ? 'Structured Data' : `${language} Block`,
    });
  }

  const tableMatch = text.match(TABLE_REGEX);
  if (tableMatch && tableDataRowCount(tableMatch[1]) >= MIN_TABLE_DATA_ROWS) {
    artifacts.push({
      id: `table-${artifacts.length}`,
      type: 'data',
      content: tableMatch[1].trim(),
      title: 'Data Table',
    });
  }

  return artifacts;
}
