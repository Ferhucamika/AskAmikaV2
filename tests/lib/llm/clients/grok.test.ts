import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('openai', () => ({
  default: vi.fn(() => ({ chat: { completions: { create: mockCreate } } })),
}));

import { GrokClient } from '@/lib/llm/clients/grok';

beforeEach(() => {
  mockCreate.mockReset();
});

async function* mockStream(deltas: (string | undefined)[]) {
  for (const delta of deltas) {
    yield { choices: [{ delta: { content: delta } }] };
  }
}

describe('Grok Client', () => {
  test('stream yields non-empty delta chunks', async () => {
    mockCreate.mockResolvedValue(mockStream(['Hello', ', ', 'world']));

    const client = new GrokClient('grok-3');
    const chunks: string[] = [];
    for await (const chunk of client.stream([{ role: 'user', content: 'hi' }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ', ', 'world']);
  });

  test('stream skips undefined deltas', async () => {
    mockCreate.mockResolvedValue(mockStream(['A', undefined, 'B']));

    const client = new GrokClient('grok-3');
    const out: string[] = [];
    for await (const chunk of client.stream([{ role: 'user', content: 'x' }])) {
      out.push(chunk);
    }

    expect(out).toEqual(['A', 'B']);
  });

  test('complete concatenates all chunks', async () => {
    mockCreate.mockResolvedValue(mockStream(['1', '2', '3']));

    const client = new GrokClient('grok-3');
    const result = await client.complete([{ role: 'user', content: 'count' }]);

    expect(result).toBe('123');
  });

  test('passes stream: true and correct model to OpenAI SDK', async () => {
    mockCreate.mockResolvedValue(mockStream(['ok']));

    const client = new GrokClient('grok-3');
    await client.complete([{ role: 'user', content: 'hi' }]);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'grok-3', stream: true })
    );
  });
});
