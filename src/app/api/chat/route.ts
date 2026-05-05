import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuestion } from '@/lib/mcp/analyzer';
import { selectBestModel } from '@/lib/llm/router';
import { ClaudeClient } from '@/lib/llm/clients/claude';
import { OpenAIClient } from '@/lib/llm/clients/openai';
import type { LLMClient } from '@/lib/llm/types';

interface ChatRequestBody {
  question?: string;
  overrideModelId?: string;
}

export async function POST(request: NextRequest) {
  const { question, overrideModelId } = (await request.json()) as ChatRequestBody;

  if (!question) {
    return NextResponse.json({ error: 'No question provided' }, { status: 400 });
  }

  try {
    const analysis = await analyzeQuestion(question);
    // Logged for future Fabric routing; not branched on yet.
    console.log('Question analysis:', analysis);

    const selectedModel = selectBestModel(analysis, { overrideModelId });

    let client: LLMClient;
    if (selectedModel.provider === 'anthropic') {
      client = new ClaudeClient(selectedModel.model);
    } else {
      client = new OpenAIClient(selectedModel.model);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of client.stream([
            { role: 'user', content: question },
          ])) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Selected-Model': selectedModel.id,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}
