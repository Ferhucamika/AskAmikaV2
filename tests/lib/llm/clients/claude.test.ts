import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }));

vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({ messages: { create: mockCreate } })),
}));

import { ClaudeClient } from '@/lib/llm/clients/claude';

beforeEach(() => {
  mockCreate.mockReset();
});

async function* mockStream(chunks: string[]) {
  for (const chunk of chunks) {
    yield {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: chunk },
    };
  }
}

describe('Claude Client', () => {
  test('stream yields each text_delta chunk in order', async () => {
    mockCreate.mockResolvedValue(mockStream(['Hello', ', ', 'world']));

    const client = new ClaudeClient('claude-sonnet-4-6');
    const chunks: string[] = [];
    for await (const chunk of client.stream([{ role: 'user', content: 'Say hi' }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ', ', 'world']);
  });

  test('stream ignores non-text_delta events', async () => {
    async function* mixed() {
      yield { type: 'message_start' };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'A' } };
      yield { type: 'content_block_delta', delta: { type: 'input_json_delta' } };
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'B' } };
      yield { type: 'message_stop' };
    }
    mockCreate.mockResolvedValue(mixed());

    const client = new ClaudeClient('claude-sonnet-4-6');
    const out: string[] = [];
    for await (const chunk of client.stream([{ role: 'user', content: 'x' }])) {
      out.push(chunk);
    }

    expect(out).toEqual(['A', 'B']);
  });

  test('complete concatenates all streamed chunks', async () => {
    mockCreate.mockResolvedValue(mockStream(['1', '2', '3']));

    const client = new ClaudeClient('claude-sonnet-4-6');
    const result = await client.complete([{ role: 'user', content: 'Count' }]);

    expect(result).toBe('123');
  });

  test('passes correct model and stream:true to the SDK', async () => {
    mockCreate.mockResolvedValue(mockStream(['ok']));

    const client = new ClaudeClient('claude-opus-4-7');
    await client.complete([{ role: 'user', content: 'hi' }]);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-7',
        stream: true,
      })
    );
  });
});
