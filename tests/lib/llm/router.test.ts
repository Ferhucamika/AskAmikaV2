import { describe, expect, test } from 'vitest';
import { selectBestModel } from '@/lib/llm/router';

describe('Model Router', () => {
  test('should select Opus for complex business question (3+ entities)', () => {
    const model = selectBestModel(
      {
        isBusinessContext: true,
        confidence: 0.9,
        entities: ['revenue', 'customer', 'quarterly analysis'],
      },
      {}
    );

    expect(model.id).toBe('claude-opus');
  });

  test('should select Sonnet for simple business question (few entities)', () => {
    const model = selectBestModel(
      {
        isBusinessContext: true,
        confidence: 0.9,
        entities: ['revenue'],
      },
      {}
    );

    expect(model.id).toBe('claude-sonnet');
  });

  test('should select a fast model for simple general questions', () => {
    const model = selectBestModel(
      {
        isBusinessContext: false,
        confidence: 0.95,
        entities: [],
      },
      {}
    );

    expect(['claude-haiku', 'openai-flagship']).toContain(model.id);
  });

  test('should respect a valid user override', () => {
    const model = selectBestModel(
      {
        isBusinessContext: true,
        confidence: 0.9,
        entities: ['revenue'],
      },
      { overrideModelId: 'claude-sonnet' }
    );

    expect(model.id).toBe('claude-sonnet');
  });

  test('should ignore an invalid override and fall back to scoring', () => {
    const model = selectBestModel(
      {
        isBusinessContext: true,
        confidence: 0.9,
        entities: ['a', 'b', 'c', 'd'],
      },
      { overrideModelId: 'gemini-pro' }
    );

    expect(model.id).toBe('claude-opus');
  });
});
