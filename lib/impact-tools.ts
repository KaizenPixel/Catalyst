import type { ImpactGraph } from './impact';

export function traceImpact(graph: ImpactGraph, selected: string) {
  const paths = new Map<string, string[]>([[selected, [selected]]]);
  const queue = [selected];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of graph.edges.filter(e => e.to === queue[i])) {
      if (paths.has(edge.from)) continue;
      paths.set(edge.from, [edge.from, ...paths.get(queue[i])!]); queue.push(edge.from);
    }
  }
  return [...paths.entries()].filter(([path]) => path !== selected).map(([path, chain]) => ({ path, chain, direct: chain.length === 2 })).sort((a, b) => a.chain.length - b.chain.length || a.path.localeCompare(b.path));
}

export function impactMarkdown(graph: ImpactGraph, selected: string, projectName: string) {
  const affected = traceImpact(graph, selected);
  return ['# Catalyst change impact', '', 'Project: ' + projectName, 'Selected file: ' + selected, '',
    'Static import reachability; these files may need review, not proof of breakage. No code was executed or changed.', '',
    '## Review paths (importer → dependency)', ...affected.map(a => '- ' + a.chain.join(' → ')),
    ...(affected.length ? [] : ['No importing source files found in this snapshot.']), '',
    '## Coverage', graph.files.length + ' source modules; ' + graph.edges.length + ' resolved links; ' + graph.unresolved.length + ' unresolved local imports; ' + graph.warnings.length + ' parse/configuration warnings.',
    'Assets, computed imports, framework routing, external packages, inherited aliases, and Python dependencies are outside this graph.', '',
    '## Cyclic groups', ...graph.cycles.map(group => '- ' + group.join(', ')), '',
    '## Warnings', ...graph.warnings.map(w => '- ' + w.path + ': ' + w.message)].join('\n');
}

