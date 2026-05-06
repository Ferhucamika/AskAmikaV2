import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockGenerateContentStream } = vi.hoisted(() => ({
  mockGenerateContentStream: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: { generateContentStream: mockGenerateContentStream },
  })),
}));

import { GeminiClient } from '@/lib/llm/clients/gemini';

beforeEach(() => {
  mockGenerateContentStream.mockReset();
});

async function* mockStream(texts: (string | undefined)[]) {
  for (const text of texts) {
    yield { text };
  }
}

describe('Gemini Client', () => {
  test('stream yields non-empty text chunks', async () => {
    mockGenerateContentStream.mockResolvedValue(mockStream(['Hello', ', ', 'world']));

    const client = new GeminiClient('gemini-2.5-flash');
    const chunks: string[] = [];
    for await (const chunk of client.stream([{ role: 'user', content: 'hi' }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ', ', 'world']);
  });

  test('stream skips chunks with no text', async () => {
    mockGenerateContentStream.mockResolvedValue(mockStream(['A', undefined, 'B']));

    const client = new GeminiClient('gemini-2.5-flash');
    const out: string[] = [];
    for await (const chunk of client.stream([{ role: 'user', content: 'x' }])) {
      out.push(chunk);
    }

    expect(out).toEqual(['A', 'B']);
  });

  test('complete concatenates all chunks', async () => {
    mockGenerateContentStream.mockResolvedValue(mockStream(['1', '2', '3']));

    const client = new GeminiClient('gemini-2.5-flash');
    const result = await client.complete([{ role: 'user', content: 'count' }]);

    expect(result).toBe('123');
  });

  test('maps assistant role to model for Gemini API', async () => {
    mockGenerateContentStream.mockResolvedValue(mockStream(['ok']));

    const client = new GeminiClient('gemini-2.5-flash');
    await client.complete([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);

    const call = mockGenerateContentStream.mock.calls[0][0];
    expect(call.contents[1].role).toBe('model');
  });
});
