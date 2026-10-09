"use client";

import { useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, CheckCheck, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { learningPlanMarkdown, planStageLabels, type PlanStage, type PlanTask } from '@/lib/learning-plan';

export function LearningPlan({ projectName, tasks, currentIds, partial, busy, onChange, onReview, onExplain }: {
  projectName: string; tasks: PlanTask[]; currentIds: string[]; partial: boolean; busy: boolean;
  onChange: (id: string, change: Partial<Pick<PlanTask, 'stage' | 'note'>>) => void;
  onReview: () => void; onExplain: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | PlanStage>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const cleared = tasks.filter(task => task.stage === 'cleared').length;
  const visible = tasks.filter(task => filter === 'all' || task.stage === filter);
  function exportPlan() {
    const url = URL.createObjectURL(new Blob([learningPlanMarkdown(projectName, tasks)], { type: 'text/markdown' }));
    const link = document.createElement('a'); link.href = url; link.download = 'catalyst-learning-plan.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="learning-plan" aria-label="Learning plan">
    <div className="plan-intro"><div><p className="eyebrow">FROM FINDING TO UNDERSTANDING</p><h2>Your next steps, made tangible.</h2><p>Choose a finding, work on it in your editor, and explain what you learned. Import your updated project to check what changed.</p></div><BookOpen size={38} aria-hidden="true"/></div>
    <div className="plan-summary"><div><strong>{cleared}<span> / {tasks.length}</span></strong><p>tracked findings no longer detected</p></div><div className="plan-summary-actions"><Button variant="outline" onClick={exportPlan} disabled={!tasks.length}><ArrowDownToLine size={15}/>Export learning journal</Button><Button onClick={onReview} disabled={busy}>Review updated project<ArrowRight size={15}/></Button></div></div>
    <p className="plan-notice">Progress and notes stay in this tab until you close the project or reload. “No longer detected” is based on local checks, not executed tests.</p>
    {partial && <p className="feedback partial" role="status">This import skipped oversized files. Missing findings will not be marked cleared until a complete import.</p>}
    <div className="plan-filters" aria-label="Filter learning tasks">
      {(['all', 'queued', 'working', 'ready', 'cleared'] as const).map(stage => <button key={stage} aria-pressed={filter === stage} onClick={() => setFilter(stage)}>{stage === 'all' ? 'All tasks' : planStageLabels[stage]}<span>{stage === 'all' ? tasks.length : tasks.filter(task => task.stage === stage).length}</span></button>)}
    </div>
    <div className="plan-tasks">{visible.map(task => {
      const id = task.finding.id;
      const present = currentIds.includes(id);
      return <article key={id} className="plan-task" data-stage={task.stage}>
        <div className="plan-task-top"><span className={'priority ' + task.finding.severity.toLowerCase()}>{task.finding.severity}</span><span>{task.finding.category}</span><span className="plan-stage">{task.stage === 'cleared' && <CheckCheck size={14}/>} {planStageLabels[task.stage]}</span></div>
        <h3>{task.finding.title}</h3><p className="plan-evidence">{!present && 'Previous evidence: '}{task.finding.location}</p>
        <div className="plan-task-actions">{task.stage !== 'cleared' && <label>My progress<select aria-label={'Progress for ' + task.finding.title} value={task.stage} onChange={event => onChange(id, { stage: event.target.value as PlanStage })}><option value="queued">To learn</option><option value="working">In progress</option><option value="ready">Ready to review</option></select></label>}
          {present && <button className="plan-link" onClick={() => onExplain(id)}>Explore with mentor<ArrowRight size={14}/></button>}
          <button className="plan-link" aria-expanded={expanded === id} aria-controls={'plan-note-' + id} onClick={() => setExpanded(expanded === id ? null : id)}>{task.note ? 'Edit learning note' : 'Add learning note'}<BookOpen size={14}/></button>
        </div>
        {task.stage === 'ready' && <p className="plan-hint">Ready when you are: save your changes, then select Review updated project.</p>}
        <div id={'plan-note-' + id} hidden={expanded !== id} className="plan-note"><label htmlFor={'note-' + id}>What changed, why, and how did you check it?</label><textarea id={'note-' + id} maxLength={4000} rows={4} value={task.note} onChange={event => onChange(id, { note: event.target.value })} placeholder="Capture your own reasoning. Avoid including credentials or other sensitive details."/><small>{task.note.length} / 4,000 characters · Included in your journal export</small></div>
      </article>;
    })}</div>
    {!visible.length && <div className="inline-empty"><ListTodo size={28}/><h3>{tasks.length ? 'No tasks in this stage' : 'No findings to turn into tasks'}</h3><p>{tasks.length ? 'Choose another filter to see your learning plan.' : 'Import a project with findings to start a plan. Continue testing even when local checks pass.'}</p></div>}
  </section>;
}
