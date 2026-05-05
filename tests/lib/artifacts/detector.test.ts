import { describe, expect, test } from 'vitest';
import { detectArtifacts } from '@/lib/artifacts/detector';

describe('Artifact Detector', () => {
  test('detects fenced code blocks with language', () => {
    const text = "Here's the code:\n```python\nprint(\"hello\")\n```";
    const artifacts = detectArtifacts(text);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('code');
    expect(artifacts[0].language).toBe('python');
    expect(artifacts[0].content).toBe('print("hello")');
  });

  test('detects fenced JSON as data, not code', () => {
    const text = 'Here is the data:\n```json\n{"name": "John"}\n```';
    const artifacts = detectArtifacts(text);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('data');
    expect(artifacts[0].language).toBe('json');
  });

  test('detects multi-heading markdown as a document', () => {
    const text = '# Report\n## Section 1\nContent here\n## Section 2\nMore content';
    const artifacts = detectArtifacts(text);
    expect(artifacts.some((a) => a.type === 'document')).toBe(true);
  });

  test('detects markdown tables as data', () => {
    const text = '| col1 | col2 |\n|------|------|\n| a    | b    |\n\nTrailing prose.';
    const artifacts = detectArtifacts(text);
    expect(artifacts.some((a) => a.type === 'data' && a.title === 'Data Table')).toBe(true);
  });

  test('returns empty array for plain prose', () => {
    expect(detectArtifacts('Just plain text without anything special.')).toEqual([]);
  });

  test('detects multiple code blocks in one response', () => {
    const text = "```ts\nconst a = 1;\n```\n\nand\n\n```ts\nconst b = 2;\n```";
    const artifacts = detectArtifacts(text);
    expect(artifacts.filter((a) => a.type === 'code')).toHaveLength(2);
  });
});
