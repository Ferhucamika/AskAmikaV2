import { Anthropic } from '@anthropic-ai/sdk';
import { FabricAnalysisResult } from '@/lib/types';
import { extractJSON } from '@/lib/llm/json-parser';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const NEEDS_ANALYSIS_PROMPT = `You are deciding whether to query Amika's live business data (semantic model: {modelName}) to improve an LLM response.

Original question: {question}
LLM response so far: {llmResponse}

Decide YES if any of these hold:
- The response acknowledges lack of access to real data ("I don't have access to...", "I can't pull...", "you'd need access to...")
- The response is generic/vague where specific Amika sales/units/inventory/goal data would directly answer the question
- The question explicitly asks about Amika sales, products, stores, regions, retailers, units, goals, or inventory

Decide NO if the question is general knowledge, definitions, casual chat, or unrelated to Amika's business data.

Respond in JSON only (no markdown):
{
  "isNeeded": boolean,
  "reason": "one short sentence"
}`;

export async function analyzeFabricNeeds(
  question: string,
  llmResponse: string,
  datasetName: string
): Promise<FabricAnalysisResult> {
  const prompt = NEEDS_ANALYSIS_PROMPT.replace('{question}', question)
    .replace('{llmResponse}', llmResponse)
    .replace('{modelName}', datasetName);

  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response from Haiku');
  }

  const result = extractJSON<{ isNeeded: boolean; reason: string }>(block.text);

  return {
    isNeeded: result.isNeeded,
    reason: result.reason,
    modelName: datasetName,
  };
}
