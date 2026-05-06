import { FabricQueryResult } from '@/lib/types';

let fabricClient: FabricClient | null = null;

export class FabricClient {
  private workspaceId: string;
  private apiKey: string;

  constructor(workspaceId: string, apiKey?: string) {
    this.workspaceId = workspaceId;
    this.apiKey = apiKey || process.env.FABRIC_ACCESS_TOKEN || '';
  }

  async executeDAX(modelId: string, daxQuery: string): Promise<FabricQueryResult> {
    const semanticModelId = modelId;

    try {
      const result = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${this.workspaceId}/datasets/${semanticModelId}/executeQueries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queries: [
              {
                query: daxQuery,
              },
            ],
          }),
        }
      );

      if (!result.ok) {
        throw new Error(`Fabric API error: ${result.statusText}`);
      }

      const data = await result.json();
      const queryResults = data.results[0]?.result ?? [];

      return {
        modelName: modelId,
        query: daxQuery,
        result: queryResults,
      };
    } catch (error) {
      console.error('Error executing DAX query:', error);
      throw error;
    }
  }
}

export function getFabricClient(): FabricClient {
  if (!fabricClient) {
    const workspaceId = process.env.FABRIC_WORKSPACE_ID;
    if (!workspaceId) {
      throw new Error('FABRIC_WORKSPACE_ID environment variable is not set');
    }
    fabricClient = new FabricClient(workspaceId);
  }
  return fabricClient;
}
