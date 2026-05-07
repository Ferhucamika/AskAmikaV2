import { describe, expect, test, vi } from 'vitest';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

import { analyzeFabricNeeds } from '@/lib/fabric/analyzer';

describe('Fabric Analyzer', () => {
  test('should detect data need when LLM acknowledges lack of access', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: '```json\n{"isNeeded": true, "reason": "LLM lacks access to real-time company data"}\n```',
        },
      ],
    });

    const result = await analyzeFabricNeeds(
      'What was our Q3 revenue?',
      "I don't have access to your company's specific financial data...",
      'amika POS Sales'
    );

    expect(result.isNeeded).toBe(true);
    expect(result.modelName).toBe('amika POS Sales');
  });

  test('should not need data when LLM response is complete', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: '```json\n{"isNeeded": false, "reason": "Response is complete with specific numbers"}\n```',
        },
      ],
    });

    const result = await analyzeFabricNeeds(
      'What was our Q3 revenue?',
      'Based on the data I have, your Q3 revenue was $2.5M...',
      'amika POS Sales'
    );

    expect(result.isNeeded).toBe(false);
  });

  test('survives Haiku output that omits the closing markdown fence', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: '```json\n{"isNeeded": true, "reason": "User asked about Sephora units"}',
        },
      ],
    });

    const result = await analyzeFabricNeeds(
      'top Sephora products growth vs LY by units',
      "I don't have access...",
      'amika POS Sales'
    );

    expect(result.isNeeded).toBe(true);
  });
});
