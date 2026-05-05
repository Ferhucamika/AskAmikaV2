import { ClaudeClient } from './clients/claude';

export interface CouncilMemberResponse {
  model: string;
  response: string;
}

const ORCHESTRATOR_INSTRUCTIONS = `You are synthesizing responses from multiple AI models. Your task is to:
1. Identify key points of agreement
2. Highlight important disagreements
3. Extract the most valuable insights
4. Provide a recommendation if applicable

Provide a concise synthesis.`;

export async function synthesizeCouncilResponses(
  responses: CouncilMemberResponse[]
): Promise<string> {
  const orchestrator = new ClaudeClient('claude-opus-4-7');
  const memberSection = responses
    .map((r, i) => `Model ${i + 1} (${r.model}):\n${r.response}`)
    .join('\n\n');
  const prompt = `${ORCHESTRATOR_INSTRUCTIONS}\n\n${memberSection}`;
  return orchestrator.complete([{ role: 'user', content: prompt }]);
}
