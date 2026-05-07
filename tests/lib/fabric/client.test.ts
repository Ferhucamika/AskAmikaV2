import { describe, expect, test, vi, beforeEach } from 'vitest';
import { FabricClient, resetFabricCache } from '@/lib/fabric/client';

beforeEach(() => {
  vi.clearAllMocks();
  resetFabricCache();
});

describe('FabricClient', () => {
  test('should get access token on first DAX query', async () => {
    const tokenResponse = {
      access_token: 'mock-token',
      expires_in: 3600,
    };

    const queryResponse = {
      results: [
        {
          tables: [
            {
              rows: [
                { region: 'North', revenue: 1000000 },
                { region: 'South', revenue: 850000 },
              ],
            },
          ],
        },
      ],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => tokenResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => queryResponse,
      });

    const client = new FabricClient('workspace-123', 'tenant-123', 'client-123', 'secret-123');
    const result = await client.executeDAX('sales_analytics', 'EVALUATE Sales');

    expect(result.modelName).toBe('sales_analytics');
    expect(result.result).toHaveLength(2);
    expect(result.result[0]).toEqual({ region: 'North', revenue: 1000000 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('should throw error when token endpoint fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: 'Unauthorized',
    });

    const client = new FabricClient('workspace-123', 'tenant-123', 'client-123', 'secret-123');
    await expect(client.executeDAX('sales_analytics', 'EVALUATE Sales')).rejects.toThrow(
      'Failed to get access token: Unauthorized'
    );
  });

  test('should throw error when Fabric API fails', async () => {
    const tokenResponse = {
      access_token: 'mock-token',
      expires_in: 3600,
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => tokenResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

    const client = new FabricClient('workspace-123', 'tenant-123', 'client-123', 'secret-123');
    await expect(client.executeDAX('sales_analytics', 'EVALUATE Sales')).rejects.toThrow(
      'Fabric API error: Not Found'
    );
  });

  test('should handle empty result set', async () => {
    const tokenResponse = {
      access_token: 'mock-token',
      expires_in: 3600,
    };

    const queryResponse = {
      results: [{ tables: [{ rows: [] }] }],
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => tokenResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => queryResponse),
      });

    const client = new FabricClient('workspace-123', 'tenant-123', 'client-123', 'secret-123');
    const result = await client.executeDAX('sales_analytics', 'EVALUATE Sales');

    expect(result.result).toHaveLength(0);
  });
});
