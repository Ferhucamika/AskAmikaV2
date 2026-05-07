import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockAnalyze,
  mockClaudeStream,
  mockOpenAIStream,
  ClaudeClientCtor,
  OpenAIClientCtor,
  mockAnalyzeFabricNeeds,
  mockGenerateDAX,
  mockExecuteDAX,
  mockMatchCatalog,
} = vi.hoisted(() => ({
  mockAnalyze: vi.fn(),
  mockClaudeStream: vi.fn(),
  mockOpenAIStream: vi.fn(),
  ClaudeClientCtor: vi.fn(),
  OpenAIClientCtor: vi.fn(),
  mockAnalyzeFabricNeeds: vi.fn(),
  mockGenerateDAX: vi.fn(),
  mockExecuteDAX: vi.fn(),
  mockMatchCatalog: vi.fn(),
}));

vi.mock('@/lib/mcp/analyzer', () => ({
  analyzeQuestion: mockAnalyze,
}));

vi.mock('@/lib/llm/clients/claude', () => ({
  ClaudeClient: ClaudeClientCtor.mockImplementation((model: string) => ({
    model,
    stream: mockClaudeStream,
  })),
}));

vi.mock('@/lib/llm/clients/openai', () => ({
  OpenAIClient: OpenAIClientCtor.mockImplementation((model: string) => ({
    model,
    stream: mockOpenAIStream,
  })),
}));

vi.mock('@/lib/fabric/analyzer', () => ({
  analyzeFabricNeeds: mockAnalyzeFabricNeeds,
}));

vi.mock('@/lib/fabric/dax-generator', () => ({
  generateDAXQuery: mockGenerateDAX,
}));

vi.mock('@/lib/fabric/catalog-matcher', () => ({
  matchQueryCatalog: mockMatchCatalog,
}));

vi.mock('@/lib/fabric/client', () => ({
  getFabricClient: () => ({
    executeDAX: mockExecuteDAX,
  }),
}));

import { POST } from '@/app/api/chat/route';

beforeEach(() => {
  mockAnalyze.mockReset();
  mockClaudeStream.mockReset();
  mockOpenAIStream.mockReset();
  ClaudeClientCtor.mockClear();
  OpenAIClientCtor.mockClear();
  mockAnalyzeFabricNeeds.mockReset();
  mockGenerateDAX.mockReset();
  mockExecuteDAX.mockReset();
  mockMatchCatalog.mockReset();
});

async function* yieldChunks(chunks: string[]) {
  for (const c of chunks) yield c;
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  test('streams concatenated chunks for a general question via Claude', async () => {
    mockAnalyze.mockResolvedValue({
      isBusinessContext: false,
      confidence: 0.95,
      entities: [],
    });
    mockClaudeStream.mockReturnValue(yieldChunks(['Hello ', 'world']));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(postRequest({ question: 'Hi' }) as any);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(await response.text()).toBe('Hello world');
    expect(ClaudeClientCtor).toHaveBeenCalledTimes(1);
    expect(OpenAIClientCtor).not.toHaveBeenCalled();
  });

  test('routes to OpenAI client when overrideModelId is openai-flagship', async () => {
    mockAnalyze.mockResolvedValue({
      isBusinessContext: false,
      confidence: 0.9,
      entities: [],
    });
    mockOpenAIStream.mockReturnValue(yieldChunks(['from ', 'gpt']));

    const response = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postRequest({ question: 'Hi', overrideModelId: 'openai-flagship' }) as any
    );

    expect(await response.text()).toBe('from gpt');
    expect(OpenAIClientCtor).toHaveBeenCalledWith('gpt-5.5');
    expect(ClaudeClientCtor).not.toHaveBeenCalled();
  });

  test('returns 400 when question is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(postRequest({}) as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/question/i);
  });

  test('returns 500 when analyzer throws', async () => {
    mockAnalyze.mockRejectedValue(new Error('Anthropic down'));

    const response = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postRequest({ question: 'Hi' }) as any
    );

    expect(response.status).toBe(500);
  });

  test('invokes catalog matcher and Fabric flow when business context + needs data', async () => {
    mockAnalyze.mockResolvedValue({
      isBusinessContext: true,
      confidence: 0.95,
      entities: ['Sephora', 'products', 'growth'],
      semanticModel: 'sales_analytics',
    });
    mockClaudeStream
      .mockReturnValueOnce(yieldChunks(['initial ', 'response']))
      .mockReturnValueOnce(yieldChunks(['enhanced ', 'with data']));
    mockAnalyzeFabricNeeds.mockResolvedValue({
      isNeeded: true,
      reason: 'Lacks real data',
    });
    mockMatchCatalog.mockResolvedValue({
      matched: true,
      queryKey: 'sephora_top_products_growth_units_ly',
      confidence: 0.92,
    });
    mockGenerateDAX.mockResolvedValue('EVALUATE TOPN(...)');
    mockExecuteDAX.mockResolvedValue({
      modelName: 'sales_analytics',
      query: 'EVALUATE TOPN(...)',
      result: [{ product: 'X', units: 100 }],
    });

    const response = await POST(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postRequest({ question: 'Top Sephora products growth' }) as any
    );

    expect(response.status).toBe(200);
    expect(mockMatchCatalog).toHaveBeenCalledWith(
      'Top Sephora products growth',
      ['Sephora', 'products', 'growth']
    );
    expect(mockGenerateDAX).toHaveBeenCalledWith(
      'Top Sephora products growth',
      ['Sephora', 'products', 'growth'],
      'sales_analytics',
      expect.objectContaining({ matched: true, queryKey: 'sephora_top_products_growth_units_ly' })
    );
    expect(await response.text()).toBe('enhanced with data');
  });
});
