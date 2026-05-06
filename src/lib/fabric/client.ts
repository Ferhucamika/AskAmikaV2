import { FabricQueryResult } from '@/lib/types';

let fabricClient: FabricClient | null = null;
let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

export class FabricClient {
  private workspaceId: string;
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;

  constructor(
    workspaceId: string,
    tenantId: string,
    clientId: string,
    clientSecret: string
  ) {
    this.workspaceId = workspaceId;
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedAccessToken && Date.now() < tokenExpiryTime) {
      return cachedAccessToken;
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
        grant_type: 'client_credentials',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    // Token expires in ~3600 seconds, cache for 3500 seconds
    tokenExpiryTime = Date.now() + data.expires_in * 1000 - 60000;

    return cachedAccessToken;
  }

  async executeDAX(modelId: string, daxQuery: string): Promise<FabricQueryResult> {
    const accessToken = await this.getAccessToken();
    const semanticModelId = modelId;

    try {
      const result = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${this.workspaceId}/datasets/${semanticModelId}/executeQueries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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
    const tenantId = process.env.FABRIC_TENANT_ID;
    const clientId = process.env.FABRIC_CLIENT_ID;
    const clientSecret = process.env.FABRIC_CLIENT_SECRET;

    if (!workspaceId || !tenantId || !clientId || !clientSecret) {
      throw new Error(
        'Missing Fabric service principal configuration: FABRIC_WORKSPACE_ID, FABRIC_TENANT_ID, FABRIC_CLIENT_ID, FABRIC_CLIENT_SECRET'
      );
    }

    fabricClient = new FabricClient(workspaceId, tenantId, clientId, clientSecret);
  }
  return fabricClient;
}

export function resetFabricCache(): void {
  cachedAccessToken = null;
  tokenExpiryTime = 0;
  fabricClient = null;
}
