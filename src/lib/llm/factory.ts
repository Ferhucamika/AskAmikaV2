import { ModelEntry } from '@/lib/constants';
import { LLMClient } from './types';
import { ClaudeClient } from './clients/claude';
import { OpenAIClient } from './clients/openai';
import { GeminiClient } from './clients/gemini';
import { GrokClient } from './clients/grok';

export function clientFor(model: ModelEntry): LLMClient {
  switch (model.provider) {
    case 'anthropic':
      return new ClaudeClient(model.model);
    case 'openai':
      return new OpenAIClient(model.model);
    case 'google':
      return new GeminiClient(model.model);
    case 'xai':
      return new GrokClient(model.model);
  }
}
