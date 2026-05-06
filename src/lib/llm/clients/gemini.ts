import { GoogleGenAI } from '@google/genai';
import { ChatMessage, LLMClient } from '../types';

export class GeminiClient implements LLMClient {
  readonly name = 'Gemini';
  readonly model: string;
  readonly capabilities = ['analysis', 'multimodal', 'research', 'code'];

  private readonly client: GoogleGenAI;

  constructor(model: string) {
    this.model = model;
    this.client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  }

  async *stream(messages: ChatMessage[]): AsyncIterable<string> {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await this.client.models.generateContentStream({
      model: this.model,
      contents,
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) yield text;
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
