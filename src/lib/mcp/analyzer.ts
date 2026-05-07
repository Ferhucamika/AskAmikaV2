import { Anthropic } from '@anthropic-ai/sdk';
import { QuestionAnalysis } from '@/lib/types';
import { extractJSON } from '@/lib/llm/json-parser';

const ANALYSIS_PROMPT = `You are a question classifier for a business intelligence system. Analyze the following question and determine:
1. Is it about business/company data? (yes/no)
2. Confidence level (0-1)
3. Key entities mentioned (list)
4. If business context: which semantic model would contain the answer? (e.g., sales_analytics, inventory, hr, finance, marketing; null if not business)

Respond in JSON format:
{
  "isBusinessContext": boolean,
  "confidence": number,
  "entities": ["entity1", "entity2"],
  "semanticModel": "model_name_or_null"
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
  semanticModel?: string | null;
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
    semanticModel: analysis.semanticModel ?? undefined,
  };
}
