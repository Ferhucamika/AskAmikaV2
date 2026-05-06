import { NextRequest, NextResponse } from 'next/server';
import { MODELS, ModelEntry } from '@/lib/constants';
import { clientFor } from '@/lib/llm/factory';
import { synthesizeCouncilResponses } from '@/lib/llm/orchestrator';

interface CouncilRequestBody {
  question?: string;
  modelIds?: string[];
}

const DEFAULT_MODEL_IDS = ['claude-opus', 'claude-sonnet', 'openai-flagship'];


export async function POST(request: NextRequest) {
  const { question, modelIds } = (await request.json()) as CouncilRequestBody;

  if (!question) {
    return NextResponse.json({ error: 'No question provided' }, { status: 400 });
  }

  const requestedIds = modelIds && modelIds.length > 0 ? modelIds : DEFAULT_MODEL_IDS;
  const selected: ModelEntry[] = [];
  for (const id of requestedIds) {
    const found = MODELS.find((m) => m.id === id);
    if (!found) {
      return NextResponse.json(
        { error: `Unknown model id: ${id}` },
        { status: 400 }
      );
    }
    selected.push(found);
  }

  if (selected.length < 3) {
    return NextResponse.json(
      { error: 'Council requires at least 3 models' },
      { status: 400 }
    );
  }

  try {
    const responses = await Promise.all(
      selected.map(async (model) => ({
        model: model.name,
        response: await clientFor(model).complete([
          { role: 'user', content: question },
        ]),
      }))
    );

    const orchestratorSummary = await synthesizeCouncilResponses(responses);

    return NextResponse.json({ responses, orchestratorSummary });
  } catch (error) {
    console.error('Council error:', error);
    return NextResponse.json(
      { error: 'Failed to get council responses' },
      { status: 500 }
    );
  }
}
