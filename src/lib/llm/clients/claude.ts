import { Anthropic } from '@anthropic-ai/sdk';
import { ChatMessage, LLMClient } from '../types';

export class ClaudeClient implements LLMClient {
  readonly name = 'Claude';
  readonly model: string;
  readonly capabilities = ['analysis', 'creative', 'research', 'code'];

  private readonly client: Anthropic;

  constructor(model: string) {
    this.model = model;
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async *stream(messages: ChatMessage[]): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages,
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    let fullText = '';
    for await (const chunk of this.stream(messages)) {
      fullText += chunk;
    }
    return fullText;
  }
}
