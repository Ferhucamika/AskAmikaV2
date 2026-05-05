export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LLMClient {
  name: string;
  model: string;
  capabilities: string[];

  stream(messages: ChatMessage[]): AsyncIterable<string>;
  complete(messages: ChatMessage[]): Promise<string>;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai'; // 'google' | 'xai' added when those integrations ship
  capabilities: ('analysis' | 'creative' | 'research' | 'code')[];
  rateLimit: number;
}
