import { MODELS, ModelEntry } from '@/lib/constants';
import { QuestionAnalysis } from '@/lib/types';

export interface RoutingContext {
  overrideModelId?: string;
}

const COMPLEX_BUSINESS_ENTITY_THRESHOLD = 3;

export function selectBestModel(
  analysis: QuestionAnalysis,
  context: RoutingContext
): ModelEntry {
  if (context.overrideModelId) {
    const override = MODELS.find((m) => m.id === context.overrideModelId);
    if (override) return override;
  }

  const scores = new Map<string, number>();

  for (const model of MODELS) {
    let score = analysis.confidence * 10;

    if (analysis.isBusinessContext) {
      if (model.capabilities.includes('analysis')) score += 5;

      if (analysis.entities.length >= COMPLEX_BUSINESS_ENTITY_THRESHOLD) {
        if (model.id === 'claude-opus') score += 8;
      } else if (model.id === 'claude-sonnet') {
        score += 7;
      }
    } else {
      if (model.speed === 'very-fast' || model.speed === 'fast') score += 4;
      if (model.capabilities.includes('creative')) score += 3;
    }

    scores.set(model.id, score);
  }

  const winnerId = [...scores.entries()].sort(
    ([, a], [, b]) => b - a
  )[0][0];

  const winner = MODELS.find((m) => m.id === winnerId);
  if (!winner) throw new Error(`Router selected unknown model id: ${winnerId}`);
  return winner;
}
