import { describe, expect, test } from 'vitest';
import { extractJSON } from '@/lib/llm/json-parser';

describe('extractJSON', () => {
  test('parses bare JSON', () => {
    const result = extractJSON<{ a: number }>('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  test('parses JSON wrapped in markdown fence with json language', () => {
    const result = extractJSON<{ a: number }>('```json\n{"a": 2}\n```');
    expect(result).toEqual({ a: 2 });
  });

  test('parses JSON wrapped in plain markdown fence', () => {
    const result = extractJSON<{ a: number }>('```\n{"a": 3}\n```');
    expect(result).toEqual({ a: 3 });
  });

  test('parses JSON with leading fence but missing closing fence (truncated)', () => {
    const result = extractJSON<{ a: number; b: string }>(
      '```json\n{"a": 4, "b": "hello"}'
    );
    expect(result).toEqual({ a: 4, b: 'hello' });
  });

  test('parses JSON surrounded by prose', () => {
    const result = extractJSON<{ a: number }>(
      'Here is the result: {"a": 5} hope that helps!'
    );
    expect(result).toEqual({ a: 5 });
  });

  test('throws on completely invalid input', () => {
    expect(() => extractJSON('not json at all')).toThrow();
  });
});
