import { describe, expect, test, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

import { matchQueryCatalog } from '@/lib/fabric/catalog-matcher';
import { resetRulesCache } from '@/lib/fabric/rules-loader';

beforeEach(() => {
  mockCreate.mockReset();
  resetRulesCache();
});

describe('matchQueryCatalog', () => {
  test('returns matched=true when Haiku finds a high-confidence catalog match', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            queryKey: 'sephora_top_products_growth_units_ly',
            confidence: 0.92,
            reason: 'Direct match for Sephora product growth vs LY in units',
          }),
        },
      ],
    });

    const result = await matchQueryCatalog(
      'Show me top Sephora products growth vs LY by units',
      ['Sephora', 'products', 'growth']
    );

    expect(result.matched).toBe(true);
    expect(result.queryKey).toBe('sephora_top_products_growth_units_ly');
    expect(result.confidence).toBe(0.92);
  });

  test('returns matched=false when Haiku returns "none"', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            queryKey: 'none',
            confidence: 0,
            reason: 'No relevant catalog entry',
          }),
        },
      ],
    });

    const result = await matchQueryCatalog("What's the weather like?", []);

    expect(result.matched).toBe(false);
    expect(result.queryKey).toBeUndefined();
  });

  test('returns matched=false when confidence is below threshold', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            queryKey: 'sephora_kpi_sales_ly',
            confidence: 0.4,
            reason: 'Weak match',
          }),
        },
      ],
    });

    const result = await matchQueryCatalog('Tell me about Sephora', ['Sephora']);
    expect(result.matched).toBe(false);
    expect(result.confidence).toBe(0.4);
  });

  test('returns matched=false when queryKey not in catalog', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            queryKey: 'nonexistent_key_xyz',
            confidence: 0.95,
            reason: 'Hallucinated key',
          }),
        },
      ],
    });

    const result = await matchQueryCatalog('Some question', []);
    expect(result.matched).toBe(false);
  });

  test('returns matched=false when Haiku response is invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: 'this is not json at all',
        },
      ],
    });

    const result = await matchQueryCatalog('Some question', []);
    expect(result.matched).toBe(false);
  });

  test('handles JSON wrapped in markdown code fence', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text:
            '```json\n' +
            JSON.stringify({
              queryKey: 'sephora_kpi_sales_ly',
              confidence: 0.88,
              reason: 'KPI summary match',
            }) +
            '\n```',
        },
      ],
    });

    const result = await matchQueryCatalog('Sephora KPI sales vs LY', [
      'Sephora',
      'KPI',
    ]);
    expect(result.matched).toBe(true);
    expect(result.queryKey).toBe('sephora_kpi_sales_ly');
  });

  test('returns daxTemplate when matched key has one (generic templates catalog)', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            queryKey: 'top_revenue_drivers_current',
            confidence: 0.9,
            reason: 'Generic top revenue match',
          }),
        },
      ],
    });

    const result = await matchQueryCatalog(
      'What are the top 5 revenue drivers right now?',
      ['revenue']
    );
    expect(result.matched).toBe(true);
    expect(result.daxTemplate).toBeDefined();
    expect(result.daxTemplate).toContain('EVALUATE');
  });
});
