import { describe, expect, test, vi, beforeEach } from 'vitest';
import { FabricClient } from '@/lib/fabric/client';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FabricClient', () => {
  test('should execute a DAX query successfully', async () => {
    const mockResponse = {
      results: [
        {
          result: [
            { region: 'North', revenue: 1000000 },
            { region: 'South', revenue: 850000 },
          ],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const client = new FabricClient('workspace-123');
    const result = await client.executeDAX('sales_analytics', 'EVALUATE Sales');

    expect(result.modelName).toBe('sales_analytics');
    expect(result.result).toHaveLength(2);
    expect(result.result[0]).toEqual({ region: 'North', revenue: 1000000 });
  });

  test('should throw error when Fabric API fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    });

    const client = new FabricClient('workspace-123');
    await expect(client.executeDAX('sales_analytics', 'EVALUATE Sales')).rejects.toThrow(
      'Fabric API error'
    );
  });

  test('should handle empty result set', async () => {
    const mockResponse = {
      results: [{ result: [] }],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const client = new FabricClient('workspace-123');
    const result = await client.executeDAX('sales_analytics', 'EVALUATE Sales');

    expect(result.result).toHaveLength(0);
  });
});
