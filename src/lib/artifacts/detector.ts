import { Artifact } from '@/lib/types';

const DATA_LANGUAGES = new Set(['json', 'csv', 'yaml', 'yml', 'toml', 'xml']);

const FENCE_REGEX = /```(\w+)?\n([\s\S]*?)\n```/g;
const TABLE_REGEX = /^(\|.+\|\n\|[-:|\s]+\|(?:\n\|.+\|)*)/m;
const HEADING_REGEX = /^#{1,6}\s/gm;

export function detectArtifacts(text: string): Artifact[] {
  const artifacts: Artifact[] = [];

  let match: RegExpExecArray | null;
  while ((match = FENCE_REGEX.exec(text)) !== null) {
    const [, rawLang, content] = match;
    const language = rawLang || 'text';
    const isData = DATA_LANGUAGES.has(language.toLowerCase());
    artifacts.push({
      id: `${isData ? 'data' : 'code'}-${artifacts.length}`,
      type: isData ? 'data' : 'code',
      language,
      content: content.trim(),
      title: isData ? 'Structured Data' : `${language} Block`,
    });
  }

  const tableMatch = text.match(TABLE_REGEX);
  if (tableMatch) {
    artifacts.push({
      id: `table-${artifacts.length}`,
      type: 'data',
      content: tableMatch[1].trim(),
      title: 'Data Table',
    });
  }

  const headingCount = text.match(HEADING_REGEX)?.length ?? 0;
  if (headingCount >= 2) {
    artifacts.push({
      id: `doc-${artifacts.length}`,
      type: 'document',
      content: text.trim(),
      title: 'Document',
    });
  }

  return artifacts;
}
