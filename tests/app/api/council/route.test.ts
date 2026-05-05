import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockClaudeComplete,
  mockOpenAIComplete,
  mockSynthesize,
  ClaudeCtor,
  OpenAICtor,
} = vi.hoisted(() => ({
  mockClaudeComplete: vi.fn(),
  mockOpenAIComplete: vi.fn(),
  mockSynthesize: vi.fn(),
  ClaudeCtor: vi.fn(),
  OpenAICtor: vi.fn(),
}));

vi.mock('@/lib/llm/clients/claude', () => ({
  ClaudeClient: ClaudeCtor.mockImplementation((model: string) => ({
    model,
    complete: mockClaudeComplete,
  })),
}));

vi.mock('@/lib/llm/clients/openai', () => ({
  OpenAIClient: OpenAICtor.mockImplementation((model: string) => ({
    model,
    complete: mockOpenAIComplete,
  })),
}));

vi.mock('@/lib/llm/orchestrator', () => ({
  synthesizeCouncilResponses: mockSynthesize,
}));

import { POST } from '@/app/api/council/route';

beforeEach(() => {
  mockClaudeComplete.mockReset();
  mockOpenAIComplete.mockReset();
  mockSynthesize.mockReset();
  ClaudeCtor.mockClear();
  OpenAICtor.mockClear();
});

function postRequest(body: unknown) {
  return new Request('http://localhost/api/council', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/council', () => {
  test('runs default 3-model triplet and returns synthesis', async () => {
    mockClaudeComplete
      .mockResolvedValueOnce('opus answer')
      .mockResolvedValueOnce('sonnet answer');
    mockOpenAIComplete.mockResolvedValueOnce('gpt answer');
    mockSynthesize.mockResolvedValue('the synthesis');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(postRequest({ question: 'why?' }) as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.responses).toEqual([
      { model: 'Claude Opus', response: 'opus answer' },
      { model: 'Claude Sonnet', response: 'sonnet answer' },
      { model: 'GPT-5.5', response: 'gpt answer' },
    ]);
    expect(body.orchestratorSummary).toBe('the synthesis');
    expect(ClaudeCtor).toHaveBeenCalledTimes(2);
    expect(OpenAICtor).toHaveBeenCalledWith('gpt-5.5');
    expect(mockSynthesize).toHaveBeenCalledOnce();
  });

  test('returns 400 when question is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(postRequest({}) as any);
    expect(response.status).toBe(400);
  });

  test('returns 400 when an unknown model id is supplied', async () => {
    const response = await POST(
      postRequest({
        question: 'q',
        modelIds: ['claude-opus', 'unknown-model', 'claude-sonnet'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );
    expect(response.status).toBe(400);
  });

  test('returns 500 when a council member errors', async () => {
    mockClaudeComplete.mockRejectedValueOnce(new Error('rate limit'));
    mockClaudeComplete.mockResolvedValueOnce('sonnet ok');
    mockOpenAIComplete.mockResolvedValueOnce('gpt ok');

    const response = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postRequest({ question: 'q' }) as any
    );
    expect(response.status).toBe(500);
  });
});
