import { describe, expect, test, vi } from 'vitest';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

import { generateDAXQuery } from '@/lib/fabric/dax-generator';

describe('DAX Generator', () => {
  test('should generate a valid DAX query starting with EVALUATE', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: 'EVALUATE SUMMARIZE(Sales, Sales[Region], "Total Revenue", SUMX(Sales, Sales[Amount]))',
        },
      ],
    });

    const query = await generateDAXQuery(
      'What is revenue by region?',
      ['revenue', 'region'],
      'sales_analytics'
    );

    expect(query).toContain('EVALUATE');
  });

  test('should throw error if response does not start with EVALUATE', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: 'SELECT * FROM Sales',
        },
      ],
    });

    await expect(
      generateDAXQuery('What is revenue by region?', ['revenue', 'region'], 'sales_analytics')
    ).rejects.toThrow('does not start with EVALUATE');
  });

  test('should trim whitespace from generated query', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: '  EVALUATE Sales  ',
        },
      ],
    });

    const query = await generateDAXQuery(
      'Show sales?',
      ['sales'],
      'sales_model'
    );

    expect(query).toBe('EVALUATE Sales');
  });
});
