import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({ messages: { create: mockCreate } })),
}));

import { analyzeQuestion } from '@/lib/mcp/analyzer';

beforeEach(() => {
  mockCreate.mockReset();
});

function mockAnalysisResponse(payload: {
  isBusinessContext: boolean;
  confidence: number;
  entities: string[];
}) {
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  });
}

describe('Question Analyzer', () => {
  test('should classify business question', async () => {
    mockAnalysisResponse({
      isBusinessContext: true,
      confidence: 0.95,
      entities: ['Product X', 'Customer Y', 'quarter'],
    });

    const result = await analyzeQuestion(
      'How many units of Product X did we sell to Customer Y this quarter?'
    );
    expect(result.isBusinessContext).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('should classify general question', async () => {
    mockAnalysisResponse({
      isBusinessContext: false,
      confidence: 0.92,
      entities: [],
    });

    const result = await analyzeQuestion('What is quantum computing?');
    expect(result.isBusinessContext).toBe(false);
  });

  test('should extract entities from business question', async () => {
    mockAnalysisResponse({
      isBusinessContext: true,
      confidence: 0.9,
      entities: ['ACME Corp', 'revenue', 'Q3'],
    });

    const result = await analyzeQuestion(
      'What is our revenue from ACME Corp in Q3?'
    );
    expect(result.entities).toContain('ACME Corp');
    expect(result.entities).toContain('revenue');
    expect(result.entities).toContain('Q3');
  });

  test('should default entities to empty array if absent', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ isBusinessContext: false, confidence: 0.7 }),
        },
      ],
    });

    const result = await analyzeQuestion('Hello');
    expect(result.entities).toEqual([]);
  });

  test('should throw on non-text response content', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
    });

    await expect(analyzeQuestion('anything')).rejects.toThrow(
      /Unexpected response type/
    );
  });
});
