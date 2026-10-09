"use client";

import { useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CheckCheck, ChevronRight, Code2, Files, FolderOpen, GitCompareArrows, GitBranch, LayoutDashboard, Pause, Play, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AiMentor } from '@/app/components/AiMentor';
import { ImpactLab } from '@/app/components/ImpactLab';
import LatticeLoader from '@/components/react-bits/LatticeLoader';
import Particles from '@/components/react-bits/Particles';
import { BubbleNavigation } from '@/app/components/BubbleNavigation';
import { CatalystMark } from '@/app/components/CatalystMark';
import { LearningPlan } from '@/app/components/LearningPlan';
import { reconcilePlan, type PlanTask } from '@/lib/learning-plan';
import { analyze, type ProjectFile } from '@/lib/analyzer';
import { compareFindings, reviewMarkdown } from '@/lib/review-tools';
import { readProjectFolder, type ImportSummary } from '@/lib/project-import';

type Report = ReturnType<typeof analyze>;
type Review = { id: number; date: string; report: Report; count: number; resolved: string[]; introduced: string[] };
type View = 'review' | 'impact' | 'plan' | 'files' | 'history';
const views = [
  { id: 'review' as const, label: 'Project review', icon: LayoutDashboard },
  { id: 'impact' as const, label: 'Impact Lab', icon: GitBranch },
  { id: 'plan' as const, label: 'Learning plan', icon: CheckCheck },
  { id: 'files' as const, label: 'File explorer', icon: Files },
  { id: 'history' as const, label: 'Review history', icon: GitCompareArrows },
];
function bytes(size: number) { return size < 1000 ? size + ' B' : size < 1000000 ? (size / 1000).toFixed(1) + ' KB' : (size / 1000000).toFixed(1) + ' MB'; }

export default function Home() {
  const [project, setProject] = useState<{name: string; files: ProjectFile[]; summary: ImportSummary} | null>(null);
  const [history, setHistory] = useState<Review[]>([]);
  const [view, setView] = useState<View>('review');
  const [selected, setSelected] = useState('');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [fileQuery, setFileQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [progress, setProgress] = useState({ read: 0, total: 0 });
  const [understood, setUnderstood] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanTask[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const importMode = useRef<'open' | 'compare'>('open');
  const nextReviewId = useRef(0);
  const report = useMemo(() => project ? analyze(project.files) : null, [project]);
  const current = report?.findings.find(f => f.id === selected);
  const findings = report?.findings.filter(f => (filter === 'All' || f.severity === filter) && (f.title + ' ' + f.location + ' ' + f.category).toLowerCase().includes(query.toLowerCase())) ?? [];
  const visibleFiles = project?.files.filter(f => f.path.toLowerCase().includes(fileQuery.toLowerCase())) ?? [];
  const latest = history[0];
  const totalBytes = useMemo(() => project?.files.reduce((n, f) => n + new TextEncoder().encode(f.content).length, 0) ?? 0, [project]);
  const coverage = report ? report.passed / report.total * 100 : 0;

  function chooseFolder(mode: 'open' | 'compare') {
    importMode.current = mode;
    input.current?.click();
  }
  async function importFolder(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true); setError(''); setProgress({ read: 0, total: 0 });
    try {
      const loaded = await readProjectFolder(Array.from(list), (read, total) => setProgress({ read, total }));
      if (importMode.current === 'compare' && project && loaded.name !== project.name)
        throw new Error('Choose the same project folder to compare changes. Use Open project to switch projects.');
      const next = analyze(loaded.files);
      const isComparison = importMode.current === 'compare' && report !== null;
      const change = isComparison ? compareFindings(report.findings, next.findings) : { resolved: [], introduced: [] };
      const review = { id: ++nextReviewId.current, date: new Date().toISOString(), report: next, count: loaded.files.length, resolved: change.resolved.map(f => f.title), introduced: change.introduced.map(f => f.title) };
      setProject(loaded); setHistory(previous => isComparison ? [review, ...previous] : [review]);
      setPlan(previous => reconcilePlan(isComparison ? previous : [], next.findings, loaded.summary.skipped > 0));
      if (!isComparison) setUnderstood([]);
      setSelected(next.findings[0]?.id ?? ''); setFilter('All'); setQuery(''); setFileQuery(''); setView('review');
    } catch (e) { setError(e instanceof Error ? e.message : 'The folder could not be read. Please try again.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  }
  function exportReview() {
    if (!project || !report) return;
    const url = URL.createObjectURL(new Blob([reviewMarkdown(project.name, report)], { type: 'text/markdown' }));
    const link = document.createElement('a'); link.href = url; link.download = 'catalyst-review.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function closeProject() {
    setPlan([]);
    setProject(null); setHistory([]); setUnderstood([]); setSelected(''); setError(''); setView('review');
  }

  return <div className="studio" data-motion-paused={motionPaused ? "" : undefined}><div className="particle-backdrop"><Particles particleColors={["#ffffff"]} particleCount={200} particleSpread={10} speed={0.1} particleBaseSize={100} moveParticlesOnHover alphaParticles={false} disableRotation={false} interactionTarget="window" paused={motionPaused}/></div>
    <header className="sidebar">
      <a className="brand" href="/" aria-label="Catalyst home"><CatalystMark className="brand-icon"/><span>catalyst<span className="brand-period">.</span></span></a>
      <BubbleNavigation items={views.map(item => ({ ...item, disabled: !project && item.id !== "review", count: item.id === "history" ? history.length : undefined }))} current={view} onSelect={setView}/>
      <div className="sidebar-bottom"><span className="workspace-local"><span className="local-dot"/>LOCAL WORKSPACE</span><button className="motion-toggle" aria-label={motionPaused ? "Resume background animation" : "Pause background animation"} aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)} title={motionPaused ? "Resume background animation" : "Pause background animation"}>{motionPaused ? <Play size={14}/> : <Pause size={14}/>}</button></div>
    </header>
    <div className="studio-main">
      {project && <div className="workspace-header"><div className="breadcrumb"><span>{project.name}</span><ChevronRight size={13}/><strong>{views.find(v => v.id === view)?.label}</strong></div><div className="header-project-actions"><button disabled={busy} onClick={closeProject}>Close project <X size={13}/></button><Button variant="outline" disabled={busy} onClick={() => chooseFolder("open")}><FolderOpen size={15}/>{busy ? "Reading…" : "Open project"}</Button></div></div>}
      <input ref={input} type="file" multiple {...({ webkitdirectory: '' } as Record<string, string>)} hidden onChange={e => void importFolder(e.target.files)} aria-label="Choose a project folder"/>
      <main className="main-content">
        {error && <div className="feedback error" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={17}/></button></div>}
        {busy && <div className="feedback importing"><LatticeLoader label="Reading project" color="var(--primary)" fontSize={13}/><span aria-live="polite">{progress.total ? progress.read + ' of ' + progress.total + ' files' : 'Inspecting selected folder…'}</span></div>}
        {!project || !report ? <section className="welcome">
          <div className="hero-grid">
            <div className="hero-copy"><div className="welcome-eyebrow"><span/> A WORKSPACE FOR DEVELOPERS IN THE MAKING</div><h1>Understand it.<br/><span>Then build it.</span></h1><p className="welcome-description">Turn your own code into your next lesson. Find the gaps, trace the connections, and learn the reasoning behind every change.</p><div className="hero-actions"><Button size="lg" disabled={busy} onClick={() => chooseFolder("open")}><FolderOpen size={17}/>{busy ? "Reading your project…" : "Open your project"}<ArrowRight size={17}/></Button><span><ShieldCheck size={14}/>Source stays on your device</span></div></div>
            <div className="workflow-poster" aria-label="Catalyst workflow: your project, local analysis, and deeper understanding">
              <div className="poster-top"><span>THE CATALYST METHOD</span><span>↗</span></div>
              <div className="poster-title">Small changes.<br/>Bigger understanding.</div>
              <CatalystMark className="poster-symbol"/>
              <div className="poster-flow">
                <div className="poster-node"><span>01</span><div><strong>Your project</strong><small>Real files. A clear starting point.</small></div><Code2 size={22}/></div>
                <div className="poster-connector" aria-hidden="true">↓</div>
                <div className="poster-node accent"><span>02</span><div><strong>Connect the dots</strong><small>Review findings. Explore dependencies.</small></div><GitBranch size={22}/></div>
                <div className="poster-connector" aria-hidden="true">↓</div>
                <div className="poster-node dark"><span>03</span><div><strong>Make it make sense</strong><small>Ask your mentor. Apply what you learn.</small></div><ArrowRight size={22}/></div>
              </div>
              <div className="poster-bottom"><span>LESS GUESSWORK.</span><span>MORE UNDERSTANDING.</span></div>
            </div>
          </div>
          <div className="import-surface"><div className="import-symbol"><FolderOpen size={23}/></div><div><h2>Your next lesson is already in your code.</h2><p>Select your project’s root folder to begin a local review.</p></div><div className="language-tags"><span>JS / TS</span><span>PYTHON</span></div></div>
          <div className="section-divider"><span>FROM YOUR FIRST REVIEW TO YOUR NEXT COMMIT</span><span>THE WORKFLOW ↘</span></div>
          <div className="welcome-notes"><div><span className="step-index">01 / DISCOVER</span><ShieldCheck size={22}/><h3>See what’s there.</h3><p>Local checks turn your source files into prioritized findings with clear evidence.</p></div><div><span className="step-index">02 / UNDERSTAND</span><Sparkles size={22}/><h3>Go beyond the fix.</h3><p>Ask Gemini to explain a finding, suggest a next step, or test your understanding.</p></div><div><span className="step-index">03 / IMPROVE</span><GitCompareArrows size={22}/><h3>Make progress visible.</h3><p>Predict which modules a change could affect in the Impact Lab. Then edit, review, and compare.</p></div></div>
          <footer className="welcome-footer"><span>YOUR FILES. YOUR LEARNING. YOUR PACE.</span><p>500 supported files max · 10 MB per project · 250 KB per file</p></footer>
        </section> : <>
          <div className="page-title"><div><p className="eyebrow">PROJECT WORKSPACE</p><h1>{project.name}</h1><p>{report.language}<span className="separator">/</span>Reviewed {new Date(latest.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><div className="title-actions"><Button variant="outline" onClick={exportReview}><ArrowDownToLine size={16}/>Export review</Button><Button disabled={busy} onClick={() => chooseFolder('compare')}><GitCompareArrows size={16}/>Review changes</Button></div></div>
          {project.summary.skipped > 0 && <div className="feedback partial" role="status">Partial review: {project.summary.skipped} supported files exceeded 250 KB and were skipped. Missing-file findings may be incomplete.</div>}
          {view === 'review' && <>
            <div className="metrics">
              <section className="metric"><span>CHECKS PASSED</span><strong>{report.passed}<small> / {report.total}</small></strong><div className="coverage-track" role="meter" aria-label="Checks passed" aria-valuemin={0} aria-valuemax={report.total} aria-valuenow={report.passed}><span style={{ width: coverage + '%' }}/></div></section>
              <section className="metric"><span>OPEN FINDINGS</span><strong>{report.findings.length}<small className="metric-note">{report.findings.filter(f => f.severity === 'High').length} high priority</small></strong><p>Detected in this snapshot</p></section>
              <section className="metric"><span>FILES REVIEWED</span><strong>{project.files.length}<small className="metric-note">{bytes(totalBytes)}</small></strong><p>{project.summary.excluded} unsupported or excluded</p></section>
              <section className="metric"><span>YOUR LEARNING</span><strong>{understood.length}<small className="metric-note">concepts understood</small></strong><p>Marked by you in this session</p></section>
            </div>
            {history.length > 1 && <div className="change-summary"><GitCompareArrows size={18}/><span><strong>{latest.resolved.length} resolved</strong> and <strong>{latest.introduced.length} new</strong> findings since the previous import.</span><button onClick={() => setView('history')}>View history <ArrowRight size={15}/></button></div>}
            <div className="review-layout">
              <section className="findings-card"><div className="panel-heading"><div><p className="eyebrow">THE REVIEW</p><h2>Where to focus</h2></div><span className="count-badge">{report.findings.length}</span></div><label className="search-field"><Search size={17}/><input aria-label="Search findings" placeholder="Search findings or file paths" value={query} onChange={e => setQuery(e.target.value)}/></label><div className="filters" aria-label="Filter priority">{['All', 'High', 'Medium', 'Low'].map(level => <button key={level} aria-pressed={filter === level} className={filter === level ? 'active' : ''} onClick={() => setFilter(level)}>{level}</button>)}</div>
                <div className="finding-list">{findings.map(f => <button key={f.id} className={'finding-row' + (current?.id === f.id ? ' selected' : '')} aria-pressed={current?.id === f.id} onClick={() => setSelected(f.id)}><div className="finding-top"><span className={'priority ' + f.severity.toLowerCase()}>{f.severity}</span><span>{f.category}</span>{understood.includes(f.id) && <CheckCheck size={15} aria-label="Marked understood"/>}</div><strong>{f.title}</strong><div className="finding-path"><Code2 size={14}/><span>{f.location}</span><ChevronRight size={15}/></div></button>)}</div>
                {!findings.length && <div className="inline-empty"><Check size={24}/><h3>{report.findings.length ? 'No matching findings' : 'All applicable checks passed'}</h3><p>{report.findings.length ? 'Try another search or priority.' : 'These checks do not prove runtime correctness. Continue testing and reviewing your code.'}</p></div>}
                <p className="panel-footnote">Rule-based findings from your files. Tests and CI are checked for presence, not executed.</p>
              </section>
              <section className="detail-card" aria-label="Selected finding">
                {current ? <><div className="detail-heading"><div className="detail-kicker"><span className={'priority ' + current.severity.toLowerCase()}>{current.severity} priority</span><span>{current.category}</span></div><h2>{current.title}</h2><div className="evidence-label">REVIEW EVIDENCE</div><code className="evidence-path">{current.location}</code></div><AiMentor key={latest.id + ':' + current.id} findingId={current.id} language={report.language} stage={report.stage}/><div className="understood-row"><button aria-pressed={understood.includes(current.id)} onClick={() => setUnderstood(previous => previous.includes(current.id) ? previous.filter(id => id !== current.id) : [...previous, current.id])}><span className={understood.includes(current.id) ? 'check-square checked' : 'check-square'}>{understood.includes(current.id) && <Check size={13}/>}</span>I understand this concept</button><p>Learning doesn’t resolve a finding. Edit your project, then review changes.</p></div></> : <div className="inline-empty"><Sparkles size={28}/><h2>No finding selected</h2><p>Select a finding to ask Gemini for guidance.</p></div>}
              </section>
            </div>
          </>}
          {view === 'impact' && <ImpactLab key={latest.id} files={project.files} projectName={project.name}/>}
          {view === 'plan' && <LearningPlan projectName={project.name} tasks={plan} currentIds={report.findings.map(f => f.id)} partial={project.summary.skipped > 0} busy={busy} onChange={(id, change) => setPlan(previous => previous.map(task => task.finding.id === id ? { ...task, ...change } : task))} onReview={() => chooseFolder('compare')} onExplain={id => { setSelected(id); setFilter('All'); setQuery(''); setView('review'); }}/>}
          {view === 'files' && <section className="file-card"><div className="panel-heading"><div><p className="eyebrow">SOURCE INVENTORY</p><h2>Files in this review</h2></div><span className="count-badge">{project.files.length}</span></div><label className="search-field"><Search size={17}/><input aria-label="Search project files" placeholder="Find a file by path" value={fileQuery} onChange={e => setFileQuery(e.target.value)}/></label><div className="table-scroll"><table><thead><tr><th>File path</th><th>Size</th><th>Lines</th></tr></thead><tbody>{visibleFiles.map(f => <tr key={f.path}><td><span><Code2 size={16}/><code>{f.path}</code></span></td><td>{bytes(new TextEncoder().encode(f.content).length)}</td><td>{f.content ? f.content.split(/\r?\n/).length : 0}</td></tr>)}</tbody></table></div>{!visibleFiles.length && <p className="inline-empty">No files match your search.</p>}<p className="panel-footnote">Dependency directories, generated output, unsupported types, and oversized files are excluded. Files remain in browser memory until you close the project or reload.</p></section>}
          {view === 'history' && <section className="history-card"><div className="panel-heading"><div><p className="eyebrow">ACTUAL IMPORTS, ACTUAL CHANGES</p><h2>Review history</h2></div><span className="count-badge">{history.length}</span></div><p className="history-intro">Snapshots from this session. Use Review changes after editing your files to record the next comparison.</p>{history.map((item, index) => <article className="history-entry" key={item.id}><div className="history-dot"/><div><div className="history-title"><h3>{index === history.length - 1 ? 'Initial review' : 'Updated review'}</h3><time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time></div><p>{item.count} files · {item.report.passed}/{item.report.total} checks passed · {item.report.findings.length} findings</p>{index !== history.length - 1 && <div className="history-changes"><section><h4>{item.resolved.length} resolved</h4>{item.resolved.map(title => <p key={title}><Check size={14}/>{title}</p>)}</section><section><h4>{item.introduced.length} new</h4>{item.introduced.map(title => <p key={title}>{title}</p>)}</section></div>}</div></article>)}</section>}
          <footer className="workspace-footer"><ShieldCheck size={14}/><span>Source stays local. Gemini receives only the finding type, language, review stage, and question choice.</span></footer>
        </>}
      </main>
    </div>
  </div>;
}





