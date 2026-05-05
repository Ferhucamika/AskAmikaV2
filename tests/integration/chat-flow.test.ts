import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({ messages: { create: mockCreate } })),
}));

import { analyzeQuestion } from '@/lib/mcp/analyzer';
import { selectBestModel } from '@/lib/llm/router';

beforeEach(() => {
  mockCreate.mockReset();
});

describe('analyzer -> router integration', () => {
  test('complex business question routes to Claude Opus', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isBusinessContext: true,
            confidence: 0.95,
            entities: ['Product A', 'Client B', 'Q3'],
          }),
        },
      ],
    });

    const analysis = await analyzeQuestion(
      'How many units of Product A did we sell to Client B in Q3?'
    );
    expect(analysis.isBusinessContext).toBe(true);
    expect(analysis.entities.length).toBeGreaterThanOrEqual(3);

    const model = selectBestModel(analysis, {});
    expect(model.id).toBe('claude-opus');
    expect(model.model).toBe('claude-opus-4-7');
  });

  test('simple general question routes to a fast model', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isBusinessContext: false,
            confidence: 0.97,
            entities: [],
          }),
        },
      ],
    });

    const analysis = await analyzeQuestion('What is quantum computing?');
    expect(analysis.isBusinessContext).toBe(false);

    const model = selectBestModel(analysis, {});
    expect(['claude-haiku', 'openai-flagship']).toContain(model.id);
  });

  test('user override survives the analysis -> routing chain', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            isBusinessContext: true,
            confidence: 0.9,
            entities: ['x', 'y', 'z', 'w'],
          }),
        },
      ],
    });

    const analysis = await analyzeQuestion('any question');
    const model = selectBestModel(analysis, { overrideModelId: 'openai-flagship' });
    expect(model.id).toBe('openai-flagship');
  });
});
