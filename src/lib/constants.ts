export type ModelSpeed = 'very-fast' | 'fast' | 'medium' | 'slow';
export type ModelCost = 'low' | 'medium' | 'high';
export type ModelProvider = 'anthropic' | 'openai';

export interface ModelEntry {
  id: string;
  name: string;
  provider: ModelProvider;
  model: string;
  capabilities: string[];
  speed: ModelSpeed;
  cost: ModelCost;
}

export const MODELS: ModelEntry[] = [
  {
    id: 'claude-opus',
    name: 'Claude Opus',
    provider: 'anthropic',
    model: 'claude-opus-4-7',
    capabilities: ['analysis', 'complex-reasoning', 'code'],
    speed: 'slow',
    cost: 'high',
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    capabilities: ['analysis', 'balanced', 'code'],
    speed: 'medium',
    cost: 'medium',
  },
  {
    id: 'claude-haiku',
    name: 'Claude Haiku',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    capabilities: ['fast', 'classification'],
    speed: 'very-fast',
    cost: 'low',
  },
  {
    id: 'openai-flagship',
    name: 'OpenAI Flagship',
    provider: 'openai',
    // TODO: confirm current OpenAI model ID before Task 7 fires the API
    model: 'TODO-confirm-current-openai-model-id',
    capabilities: ['analysis', 'multimodal', 'code'],
    speed: 'medium',
    cost: 'high',
  },
];

// Future: add Gemini and Grok entries when API keys are provisioned.

export const AMIKA_COLORS = {
  orange: '#FF6B26',
  orangeBright: '#FF7A00',
  pink: '#FB63C0',
  hotPink: '#EC008C',
  yellow: '#FFBF00',
  blue: '#38B6FF',
  lime: '#C9E167',
  coral: '#FF5555',
  black: '#000000',
  white: '#FFFFFF',
  grayLight: '#DDDDDD',
  grayText: '#6A6A6A',
} as const;
