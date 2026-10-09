"use client";

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowRight, GitBranch, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LatticeLoader from '@/components/react-bits/LatticeLoader';
import type { ProjectFile } from '@/lib/analyzer';
import type { ImpactGraph } from '@/lib/impact';
import { impactMarkdown, traceImpact } from '@/lib/impact-tools';
import ImpactWorker from '@/lib/impact.worker?worker';

export function ImpactLab({ files, projectName }: { files: ProjectFile[]; projectName: string }) {
  const [graph, setGraph] = useState<ImpactGraph | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [prediction, setPrediction] = useState('');
  const [mode, setMode] = useState<'explore' | 'predict'>('explore');
  useEffect(() => {
    setGraph(null); setError('');
    let worker: Worker;
    try { worker = new ImpactWorker(); }
    catch { setError('The local analysis worker could not start. Reload Catalyst and try again.'); return; }
    worker.onmessage = ({ data }: MessageEvent<{ graph?: ImpactGraph; error?: string }>) => {
      if (data.error) setError(data.error);
      if (data.graph) {
        const next = data.graph;
        const ranked = [...next.files].sort((a, b) => next.edges.filter(e => e.to === b).length - next.edges.filter(e => e.to === a).length || a.localeCompare(b));
        setGraph(next); setSelected(ranked[0] ?? ''); setRevealed(false); setPrediction('');
      }
    };
    worker.onerror = () => setError('The local analysis worker could not start. Reload Catalyst and try again.');
    worker.postMessage(files);
    return () => worker.terminate();
  }, [files]);
  const affected = useMemo(() => graph ? traceImpact(graph, selected) : [], [graph, selected]);
  const rankedFiles = useMemo(() => graph ? graph.files.map(path => ({ path, count: graph.edges.filter(e => e.to === path).length })).sort((a, b) => b.count - a.count || a.path.localeCompare(b.path)) : [], [graph]);
  const dependencies = graph?.edges.filter(e => e.from === selected) ?? [];
  const direct = affected.filter(a => a.direct);
  const indirect = affected.filter(a => !a.direct);
  const cycles = graph?.cycles.filter(group => group.includes(selected)) ?? [];
  const hidden = mode === 'predict' && !revealed;
  function select(path: string) { setSelected(path); setRevealed(false); setPrediction(''); }
  function download() {
    if (!graph) return;
    const url = URL.createObjectURL(new Blob([impactMarkdown(graph, selected, projectName)], { type: 'text/markdown' }));
    const a = document.createElement('a'); a.href = url; a.download = 'catalyst-change-impact.md'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="impact-lab" aria-label="Change Impact Lab">
    <div className="impact-intro"><div><p className="eyebrow">LEARN HOW YOUR PROJECT FITS TOGETHER</p><h2>One change. How far does it travel?</h2><p>Select a source file to trace the modules that depend on it. Or predict the reach first, then reveal the evidence.</p></div><span className="impact-local"><ShieldCheck size={15}/>Runs locally · 0 AI tokens</span></div>
    {error ? <p className="feedback error" role="alert">{error}</p> : !graph ? <div className="impact-loading"><LatticeLoader label="Mapping imports" color="var(--primary)"/><p>Reading syntax on your device. Your code is never executed.</p></div> : !graph.files.length ? <div className="inline-empty"><GitBranch size={28}/><h3>No JavaScript or TypeScript source files in this snapshot</h3><p>The Impact Lab currently maps JS/TS imports. Python projects can still use Project review.</p></div> : <>
      <div className="impact-overview"><span><strong>{graph.files.length}</strong> source modules</span><span><strong>{graph.edges.length}</strong> import links</span><span><strong>{graph.cycles.length}</strong> cyclic groups</span><span><strong>{graph.unresolved.length + graph.warnings.length}</strong> coverage notes</span></div>
      <div className="impact-layout"><aside className="impact-picker"><label className="search-field"><Search size={16}/><input aria-label="Search impact files" placeholder="Find a source file" value={query} onChange={e => setQuery(e.target.value)}/></label><p>Most direct importers first</p><div className="impact-file-list">{rankedFiles.filter(f => f.path.toLowerCase().includes(query.toLowerCase())).map(f => <button key={f.path} aria-pressed={selected === f.path} onClick={() => select(f.path)}><GitBranch size={15}/><span>{f.path}</span><small title="Direct importing files">{f.count}</small></button>)}{!rankedFiles.some(f => f.path.toLowerCase().includes(query.toLowerCase())) && <p>No source files match.</p>}</div></aside>
        <div className="impact-detail"><div className="impact-toolbar"><div className="filters" aria-label="Impact mode"><button aria-pressed={mode === 'explore'} className={mode === 'explore' ? 'active' : ''} onClick={() => setMode('explore')}>Explore impact</button><button aria-pressed={mode === 'predict'} className={mode === 'predict' ? 'active' : ''} onClick={() => { setMode('predict'); setRevealed(false); setPrediction(''); }}>Predict & reveal</button></div><Button variant="ghost" size="sm" disabled={hidden} onClick={download}><ArrowDownToLine size={14}/>Export map</Button></div>
          <div className="impact-selected"><span>IF I CHANGE</span><h3>{selected}</h3><p>Which other source modules could be affected through imports?</p></div>
          {hidden ? <form className="impact-prediction" onSubmit={e => { e.preventDefault(); if (prediction !== '' && Number.isInteger(Number(prediction)) && Number(prediction) >= 0) setRevealed(true); }}><label htmlFor="impact-guess">Your prediction: how many other modules depend on this file, directly or indirectly?</label><div><input id="impact-guess" type="number" min="0" max={Math.max(0, graph.files.length - 1)} step="1" required value={prediction} onChange={e => setPrediction(e.target.value)}/><Button type="submit">Reveal the dependency paths <ArrowRight size={15}/></Button></div><p>Count each importing file once. A dependency is a reason to review, not proof something will break.</p></form> : <>
            {mode === 'predict' && <div className="impact-reveal" role="status"><strong>{Number(prediction) === affected.length ? 'You traced it correctly.' : 'Here’s what the import graph reveals.'}</strong><p>You predicted {prediction}; this snapshot has {affected.length} reachable importing modules.</p></div>}
            <div className="impact-reach"><div><strong>{affected.length}</strong><span>modules to review</span></div><p><b>{direct.length}</b> direct importers<br/><b>{indirect.length}</b> indirect importers</p><div className="impact-bar" role="meter" aria-label="Reachable importing modules" aria-valuenow={affected.length} aria-valuemin={0} aria-valuemax={Math.max(1, graph.files.length - 1)}><span style={{ width: (affected.length / Math.max(1, graph.files.length - 1) * 100) + '%' }}/></div></div>
            <div className="impact-flow" aria-label="Change propagation"><div><small>CHANGE ORIGIN</small><code>{selected}</code></div><ArrowRight/><div><small>ONE IMPORT AWAY</small><strong>{direct.length} modules</strong></div><ArrowRight/><div><small>FURTHER UPSTREAM</small><strong>{indirect.length} modules</strong></div></div>
            <div className="impact-paths"><h4>Follow the evidence</h4><p>Each arrow means “imports”. Select any module to explore its own impact.</p>{affected.length ? affected.map(a => <div className="impact-path" key={a.path}><span className={'impact-distance ' + (a.direct ? 'direct' : '')}>{a.direct ? 'Direct' : (a.chain.length - 1) + ' hops'}</span><div>{a.chain.map((path, i) => <span key={path}>{i > 0 && <ArrowRight size={12}/>}<button onClick={() => select(path)} disabled={path === selected}>{path}</button></span>)}</div></div>) : <p className="impact-none">No importing modules found. This may be an entry point, a standalone file, or an unresolved dependency. It does not prove the file is unused or safe to delete.</p>}</div>
          </>}
          <details className="impact-support"><summary>This file imports {dependencies.length} local modules</summary>{dependencies.map(e => <button key={e.to} onClick={() => select(e.to)}><code>{e.to}</code><span>line {e.line} · {e.kind}</span></button>)}{!dependencies.length && <p>No resolved outgoing source imports.</p>}</details>
          {!hidden && cycles.length > 0 && <div className="impact-cycle"><h4>Circular dependency detected</h4><p>These files form a cyclic group. Review initialization order and whether shared logic could live in a separate module; a cycle alone does not prove a bug.</p>{cycles.map(group => <p key={group.join('|')}>{group.join(', ')}</p>)}</div>}
        </div></div>
      <details className="impact-coverage"><summary>Mapping coverage & limitations</summary><p>Static JS/TS imports, re-exports, literal dynamic imports, and require calls. Relative paths and explicit tsconfig/jsconfig aliases are resolved. Type imports are included: reach describes dependencies, not guaranteed runtime failure.</p><p>{graph.externalCount} external or unmapped bare imports · {graph.dynamicCount} computed imports · {graph.assetCount} asset/loader imports outside this map. Framework routing, package exports, inherited configuration, Python, and runtime behavior are not inferred. A locally shadowed require function can be counted as an import.</p>{graph.warnings.map((w, i) => <p key={'w' + i}><code>{w.path}</code> — {w.message}</p>)}{graph.unresolved.map((u, i) => <p key={'u' + i}><code>{u.path}:{u.line}</code> — unresolved local import <code>{u.specifier}</code></p>)}</details>
    </>}
  </section>;
}
