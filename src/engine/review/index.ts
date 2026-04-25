import { buildContext } from './context';
import { runPipeline } from './pipeline';
import type { ReviewInput, ReviewOutput } from './types';

export type { ReviewInput, ReviewOutput };

export function reviewMove(input: ReviewInput): ReviewOutput {
  if (
    input.category === 'best' ||
    input.category === 'excellent' ||
    input.category === 'good'
  ) {
    return { comment: null };
  }
  const ctx = buildContext(input);
  if (!ctx) return { comment: null };
  const finding = runPipeline(ctx);
  return { comment: finding ? finding.comment : null };
}
