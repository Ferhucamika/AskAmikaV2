import { Anthropic } from '@anthropic-ai/sdk';
import { QuestionAnalysis } from '@/lib/types';
import { extractJSON } from '@/lib/llm/json-parser';

const ANALYSIS_PROMPT = `You are a question classifier for a business intelligence system that has access to Amika's POS sales data (Sephora and Ulta retailers). Analyze the question and determine:
1. Is it asking about Amika's company/business data — sales, units, products, stores, regions, inventory, goals, retailer performance? (yes/no)
2. Confidence level (0-1)
3. Key entities mentioned (retailer names, product names, time scopes, metrics, locations, etc.)

A question is business context if it would be answered by querying real sales/inventory data. General knowledge, weather, definitions, or unrelated topics are NOT business context.

Respond in JSON only (no markdown):
{
  "isBusinessContext": boolean,
  "confidence": number,
  "entities": ["entity1", "entity2"]
}

Question: {question}`;

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

interface RawAnalysis {
  isBusinessContext: boolean;
  confidence: number;
  entities?: string[];
}

export async function analyzeQuestion(question: string): Promise<QuestionAnalysis> {
  const response = await getClient().messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: ANALYSIS_PROMPT.replace('{question}', question),
      },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  const analysis = extractJSON<RawAnalysis>(block.text);

  return {
    isBusinessContext: analysis.isBusinessContext,
    confidence: analysis.confidence,
    entities: analysis.entities ?? [],
  };
}
