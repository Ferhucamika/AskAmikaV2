import OpenAI from 'openai';
import { ChatMessage, LLMClient } from '../types';

export class OpenAIClient implements LLMClient {
  readonly name = 'OpenAI';
  readonly model: string;
  readonly capabilities = ['analysis', 'creative', 'research', 'code'];

  private readonly client: OpenAI;

  constructor(model: string) {
    this.model = model;
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async *stream(messages: ChatMessage[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: 4096,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
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
