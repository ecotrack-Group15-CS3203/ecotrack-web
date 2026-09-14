import type { WorkflowStage } from './types';

/** Extracted from app/(org)/workflow/page.tsx so this logic is unit-testable
 * without rendering the page. */
export function sortStages(stages: WorkflowStage[]): WorkflowStage[] {
  return stages.slice().sort((a, b) => a.position - b.position);
}

export function isReported(stage: WorkflowStage): boolean {
  return stage.position === 0 || stage.slug === 'reported';
}

export function isColorHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
