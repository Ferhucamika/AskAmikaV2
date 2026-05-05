import { Anthropic } from '@anthropic-ai/sdk';
import { QuestionAnalysis } from '@/lib/types';

const ANALYSIS_PROMPT = `You are a question classifier. Analyze the following question and determine:
1. Is it about business/company data? (yes/no)
2. Confidence level (0-1)
3. Key entities mentioned (list)

Respond in JSON format:
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
    max_tokens: 150,
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

  const analysis = JSON.parse(block.text) as RawAnalysis;

  return {
    isBusinessContext: analysis.isBusinessContext,
    confidence: analysis.confidence,
    entities: analysis.entities ?? [],
  };
}
