export function extractJSON<T>(text: string): T {
  let trimmed = text.trim();

  trimmed = trimmed.replace(/^```(?:json)?\s*/i, '');
  trimmed = trimmed.replace(/\s*```\s*$/i, '');

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    trimmed = trimmed.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(trimmed) as T;
}
