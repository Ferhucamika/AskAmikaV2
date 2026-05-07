import fs from 'node:fs';
import path from 'node:path';
import { QueryCatalogEntry } from '@/lib/types';

const RULES_DIR = path.join(process.cwd(), 'DAX_Rules_Library');

let cachedGeneralRules: string | null = null;
let cachedCatalog: QueryCatalogEntry[] | null = null;

export function loadGeneralDAXRules(): string {
  if (cachedGeneralRules !== null) return cachedGeneralRules;

  const filePath = path.join(RULES_DIR, 'general_dax.md');
  cachedGeneralRules = fs.readFileSync(filePath, 'utf-8');
  return cachedGeneralRules;
}

export function loadQueryCatalog(): QueryCatalogEntry[] {
  if (cachedCatalog !== null) return cachedCatalog;

  const descriptions = parseDescriptionsFile();
  const templates = parseTemplatesFile();

  const byKey = new Map<string, QueryCatalogEntry>();
  for (const entry of descriptions) {
    byKey.set(entry.queryKey, entry);
  }
  for (const entry of templates) {
    const existing = byKey.get(entry.queryKey);
    if (existing) {
      byKey.set(entry.queryKey, { ...existing, daxTemplate: entry.daxTemplate });
    } else {
      byKey.set(entry.queryKey, entry);
    }
  }

  cachedCatalog = Array.from(byKey.values());
  return cachedCatalog;
}

export function resetRulesCache(): void {
  cachedGeneralRules = null;
  cachedCatalog = null;
}

function parseDescriptionsFile(): QueryCatalogEntry[] {
  const filePath = path.join(RULES_DIR, 'semantic_query_pack.amika.descriptions.md');
  const content = fs.readFileSync(filePath, 'utf-8');
  const entries: QueryCatalogEntry[] = [];

  const lineRegex = /^- `([^`]+)`:\s*(.+)$/;
  for (const line of content.split('\n')) {
    const match = line.match(lineRegex);
    if (match) {
      entries.push({
        queryKey: match[1].trim(),
        description: match[2].trim(),
      });
    }
  }
  return entries;
}

function parseTemplatesFile(): QueryCatalogEntry[] {
  const filePath = path.join(RULES_DIR, 'semantic_question_library.template.json');
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content) as {
    library?: Array<{ queryKey: string; question: string; daxTemplate: string }>;
  };

  if (!data.library) return [];

  return data.library.map((item) => ({
    queryKey: item.queryKey,
    description: item.question,
    daxTemplate: item.daxTemplate,
  }));
}
