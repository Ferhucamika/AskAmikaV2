import { describe, expect, test } from 'vitest';
import { detectArtifacts } from '@/lib/artifacts/detector';

describe('Artifact Detector', () => {
  test('detects substantial fenced code blocks', () => {
    const text =
      "Here's the code:\n```python\ndef greet(name):\n    print(f\"Hello, {name}\")\n    return True\n```";
    const artifacts = detectArtifacts(text);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('code');
    expect(artifacts[0].language).toBe('python');
  });

  test('skips trivial one-line code blocks', () => {
    const text = "Run this:\n```bash\nls\n```";
    expect(detectArtifacts(text)).toEqual([]);
  });

  test('detects fenced JSON as data even if short', () => {
    const text = 'Here is the data:\n```json\n{"name": "John"}\n```';
    const artifacts = detectArtifacts(text);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('data');
    expect(artifacts[0].language).toBe('json');
  });

  test('does NOT extract a multi-heading prose response as a document', () => {
    const text =
      '# Report\n## Section 1\nContent here\n## Section 2\nMore content';
    expect(detectArtifacts(text)).toEqual([]);
  });

  test('detects markdown tables with multiple data rows', () => {
    const text =
      '| col1 | col2 |\n|------|------|\n| a    | b    |\n| c    | d    |';
    const artifacts = detectArtifacts(text);
    expect(artifacts.some((a) => a.type === 'data' && a.title === 'Data Table')).toBe(true);
  });

  test('skips a table that has only one data row', () => {
    const text = '| col1 | col2 |\n|------|------|\n| a    | b    |';
    expect(detectArtifacts(text)).toEqual([]);
  });

  test('returns empty array for plain prose', () => {
    expect(detectArtifacts('Just plain text without anything special.')).toEqual([]);
  });

  test('detects multiple substantial code blocks in one response', () => {
    const text =
      "```ts\nconst a = 1;\nconst b = 2;\nconst c = 3;\n```\n\nand\n\n```ts\nconst x = 1;\nconst y = 2;\nconst z = 3;\n```";
    const artifacts = detectArtifacts(text);
    expect(artifacts.filter((a) => a.type === 'code')).toHaveLength(2);
  });
});
