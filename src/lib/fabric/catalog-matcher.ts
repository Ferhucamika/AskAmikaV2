import { Anthropic } from '@anthropic-ai/sdk';
import { CatalogMatchResult } from '@/lib/types';
import { extractJSON } from '@/lib/llm/json-parser';
import { loadQueryCatalog } from './rules-loader';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const MIN_CONFIDENCE = 0.7;

const MATCH_PROMPT = `You are matching a user's business question to a known query key from a catalog of curated DAX queries for Amika's Fabric workspace (Sephora and Ulta retailer data).

USER QUESTION: {question}
ENTITIES: {entities}

CATALOG (queryKey: description):
{catalog}

Pick the BEST matching queryKey from the catalog above, or "none" if no entry is a clear semantic match.

Rules:
- Match by intent and grain (e.g., "top Sephora products growth vs LY by units" → sephora_top_products_growth_units_ly)
- Match retailer (Sephora vs Ulta) — never cross-match
- Match metric (sales vs units) and time scope (LY, MTD, YTD, 13w, etc.)
- If the question doesn't fit any catalog entry, return "none"
- Confidence must reflect how certain you are (0.0-1.0)

Respond in JSON only:
{
  "queryKey": "exact_key_from_catalog" | "none",
  "confidence": 0.0-1.0,
  "reason": "brief explanation"
}`;

export async function matchQueryCatalog(
  question: string,
  entities: string[]
): Promise<CatalogMatchResult> {
  const catalog = loadQueryCatalog();

  if (catalog.length === 0) {
    return { matched: false, confidence: 0 };
  }

  const catalogText = catalog
    .map((entry) => `- ${entry.queryKey}: ${entry.description}`)
    .join('\n');

  const prompt = MATCH_PROMPT
    .replace('{question}', question)
    .replace('{entities}', entities.join(', ') || 'none')
    .replace('{catalog}', catalogText);

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    return { matched: false, confidence: 0 };
  }

  let parsed: { queryKey: string; confidence: number; reason?: string };
  try {
    parsed = extractJSON<{ queryKey: string; confidence: number; reason?: string }>(
      block.text
    );
  } catch {
    return { matched: false, confidence: 0 };
  }

  if (parsed.queryKey === 'none' || parsed.confidence < MIN_CONFIDENCE) {
    return { matched: false, confidence: parsed.confidence ?? 0 };
  }

  const matchedEntry = catalog.find((e) => e.queryKey === parsed.queryKey);
  if (!matchedEntry) {
    return { matched: false, confidence: parsed.confidence };
  }

  return {
    matched: true,
    queryKey: matchedEntry.queryKey,
    daxTemplate: matchedEntry.daxTemplate,
    confidence: parsed.confidence,
  };
}
