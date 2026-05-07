import { Anthropic } from '@anthropic-ai/sdk';
import { FabricAnalysisResult, QuestionAnalysis } from '@/lib/types';
import { extractJSON } from '@/lib/llm/json-parser';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

const NEEDS_ANALYSIS_PROMPT = `You are analyzing whether an LLM response would benefit from live business data.

Original question: {question}
LLM response: {llmResponse}
Available semantic model: {modelName}

Analyze the LLM response and determine:
1. Does it acknowledge lack of access to real-time company data? (phrases like "I don't have access to...", "I don't have real-time data")
2. Does it provide vague or general information that specific data could improve?
3. Would querying the semantic model directly answer the question better?

Respond in JSON format:
{
  "isNeeded": boolean,
  "reason": "explanation of why data is or isn't needed"
}`;

export async function analyzeFabricNeeds(
  question: string,
  llmResponse: string,
  analysis: QuestionAnalysis
): Promise<FabricAnalysisResult> {
  if (!analysis.semanticModel) {
    return {
      isNeeded: false,
      reason: 'No semantic model identified for this question',
    };
  }

  const prompt = NEEDS_ANALYSIS_PROMPT.replace('{question}', question)
    .replace('{llmResponse}', llmResponse)
    .replace('{modelName}', analysis.semanticModel);

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
    modelName: analysis.semanticModel,
  };
}
