import { Anthropic } from '@anthropic-ai/sdk';
import { CatalogMatchResult } from '@/lib/types';
import { loadGeneralDAXRules } from './rules-loader';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const DAX_GENERATION_PROMPT = `You are an expert DAX query generator for Amika's Microsoft Fabric workspace.

REFERENCE RULES (follow strictly — these define the actual schema, retailer mappings, and patterns for Amika's data):
{generalRules}

USER REQUEST:
Question: {question}
Entities mentioned: {entities}
Semantic Model: {modelName}{catalogHint}

Generate ONE valid DAX EVALUATE query that answers the question using ONLY the tables, columns, retailer keys, and patterns from the reference rules above.

Hard requirements:
- Output starts with EVALUATE (no markdown, no backticks, no comments).
- Use only known tables/columns from the reference rules.
- Apply the correct retailer filter (KEEPFILTERS) and metric column for the requested grain.
- Sephora item/product-level queries are units-only — never use sales dollars at Sephora item grain.
- If a required schema element is missing, return: EVALUATE ROW("error", "Missing required schema: <what is missing>")

Return ONLY the DAX query.`;

export async function generateDAXQuery(
  question: string,
  entities: string[],
  modelName: string,
  catalogHint?: CatalogMatchResult
): Promise<string> {
  const generalRules = loadGeneralDAXRules();
  const entitiesStr = entities.join(', ') || 'none';

  let catalogHintText = '';
  if (catalogHint?.matched && catalogHint.queryKey) {
    catalogHintText = `\n\nCATALOG HINT: This question resembles the curated query key "${catalogHint.queryKey}".`;
    if (catalogHint.daxTemplate) {
      catalogHintText += `\nReference DAX template (may use placeholders — adapt to Amika's actual schema from the reference rules):\n${catalogHint.daxTemplate}`;
    }
    catalogHintText += '\nUse this as structural guidance, but always emit DAX bound to the real tables/columns in the reference rules.';
  }

  const prompt = DAX_GENERATION_PROMPT
    .replace('{generalRules}', generalRules)
    .replace('{question}', question)
    .replace('{entities}', entitiesStr)
    .replace('{modelName}', modelName)
    .replace('{catalogHint}', catalogHintText);

  const response = await getClient().messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response from Claude');
  }

  const daxQuery = block.text.trim();

  if (!daxQuery.startsWith('EVALUATE')) {
    throw new Error('Generated query does not start with EVALUATE');
  }

  return daxQuery;
}
