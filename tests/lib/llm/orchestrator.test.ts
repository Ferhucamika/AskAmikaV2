import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockComplete, ClaudeCtor } = vi.hoisted(() => ({
  mockComplete: vi.fn(),
  ClaudeCtor: vi.fn(),
}));

vi.mock('@/lib/llm/clients/claude', () => ({
  ClaudeClient: ClaudeCtor.mockImplementation(() => ({ complete: mockComplete })),
}));

import { synthesizeCouncilResponses } from '@/lib/llm/orchestrator';

beforeEach(() => {
  mockComplete.mockReset();
  ClaudeCtor.mockClear();
});

describe('synthesizeCouncilResponses', () => {
  test('uses Claude Opus 4.7 as the orchestrator', async () => {
    mockComplete.mockResolvedValue('synthesis');
    await synthesizeCouncilResponses([
      { model: 'A', response: 'a' },
      { model: 'B', response: 'b' },
      { model: 'C', response: 'c' },
    ]);
    expect(ClaudeCtor).toHaveBeenCalledWith('claude-opus-4-7');
  });

  test('returns the synthesized text', async () => {
    mockComplete.mockResolvedValue('the synthesis text');
    const result = await synthesizeCouncilResponses([
      { model: 'Opus', response: 'A' },
      { model: 'Sonnet', response: 'B' },
      { model: 'GPT', response: 'C' },
    ]);
    expect(result).toBe('the synthesis text');
  });

  test('includes each council member response in the prompt', async () => {
    mockComplete.mockResolvedValue('ok');
    await synthesizeCouncilResponses([
      { model: 'Opus', response: 'AAAAA' },
      { model: 'Sonnet', response: 'BBBBB' },
      { model: 'GPT', response: 'CCCCC' },
    ]);
    const promptArg = mockComplete.mock.calls[0][0][0].content;
    expect(promptArg).toContain('Opus');
    expect(promptArg).toContain('AAAAA');
    expect(promptArg).toContain('BBBBB');
    expect(promptArg).toContain('CCCCC');
  });
});
