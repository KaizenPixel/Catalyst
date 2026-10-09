import type { Finding } from './analyzer';

export type PlanStage = 'queued' | 'working' | 'ready' | 'cleared';
export type PlanTask = { finding: Finding; stage: PlanStage; note: string };

/** Preserve learning notes across snapshots, but never infer a fix from a partial import. */
export function reconcilePlan(previous: PlanTask[], findings: Finding[], partial: boolean): PlanTask[] {
  const current = new Map(findings.map(finding => [finding.id, finding]));
  const tasks = previous.map(task => {
    const finding = current.get(task.finding.id);
    if (finding) return { ...task, finding, stage: task.stage === 'cleared' ? 'queued' as const : task.stage };
    return { ...task, stage: partial ? task.stage : 'cleared' as const };
  });
  const known = new Set(previous.map(task => task.finding.id));
  for (const finding of findings) {
    if (!known.has(finding.id)) tasks.push({ finding, stage: 'queued', note: '' });
  }
  return tasks;
}

export const planStageLabels: Record<PlanStage, string> = {
  queued: 'To learn', working: 'In progress', ready: 'Ready to review', cleared: 'No longer detected',
};

export function learningPlanMarkdown(project: string, tasks: PlanTask[]): string {
  return ['# Catalyst learning plan', '', 'Project: ' + project.replace(/[\r\n]/g, ' '), '',
    'Based on local project snapshots. No longer detected means the heuristic stopped reporting the finding; it does not prove correctness. Notes are written by you.', '',
    ...tasks.flatMap(task => [
      '## ' + task.finding.title, '',
      'Status: ' + planStageLabels[task.stage],
      'Priority: ' + task.finding.severity + ' · ' + task.finding.category,
      'Evidence: ' + task.finding.location, '',
      '### My learning notes', '', task.note.trim() || 'No notes added.', '',
    ]),
  ].join('\n');
}
