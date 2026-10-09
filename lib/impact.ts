import { parse, parseExpression } from '@babel/parser';
import type { ProjectFile } from './analyzer';

export type ImportEdge = { from: string; to: string; line: number; kind: string };
export type ImpactGraph = {
  files: string[]; edges: ImportEdge[]; cycles: string[][];
  warnings: { path: string; message: string }[];
  unresolved: { path: string; specifier: string; line: number }[];
  externalCount: number; dynamicCount: number; assetCount: number;
};
const sourceFile = /\.[cm]?[jt]sx?$/i;
const normalize = (path: string) => {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '..') { if (!parts.length) return null; parts.pop(); }
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
};
const directory = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
// Read static JSONC configuration as syntax, without evaluating imported code.
function literal(node: any): any {
  if (node?.type === 'ObjectExpression') return Object.fromEntries(node.properties.filter((p: any) => p.type === 'ObjectProperty' && !p.computed).map((p: any) => [p.key.name ?? p.key.value, literal(p.value)]));
  if (node?.type === 'ArrayExpression') return node.elements.map(literal);
  if (node?.type === 'StringLiteral') return node.value;
  return undefined;
}

export function buildImpactGraph(input: ProjectFile[]): ImpactGraph {
  const all = input.map(f => ({ ...f, path: normalize(f.path) })).filter((f): f is ProjectFile => f.path !== null);
  const files = all.filter(f => sourceFile.test(f.path));
  const known = new Set(files.map(f => f.path));
  const graph: ImpactGraph = { files: [...known].sort(), edges: [], cycles: [], warnings: [], unresolved: [], externalCount: 0, dynamicCount: 0, assetCount: 0 };
  const configs = all.filter(f => /(^|\/)(tsconfig|jsconfig)\.json$/.test(f.path)).map(f => {
    try {
      const config = literal(parseExpression(f.content));
      if (config?.extends) graph.warnings.push({ path: f.path, message: 'Inherited configuration is not resolved; only this file’s own aliases are used.' });
      return { dir: directory(f.path), options: config?.compilerOptions ?? {} };
    } catch { graph.warnings.push({ path: f.path, message: 'Could not read path aliases in this configuration.' }); return { dir: directory(f.path), options: {} }; }
  }).sort((a, b) => b.dir.length - a.dir.length);
  const resolve = (base: string) => {
    const path = normalize(base);
    if (path === null) return undefined;
    // Prefer explicit paths, then TypeScript substitutions for emitted JS imports.
    const candidates = [path];
    if (/\.jsx?$/.test(path)) candidates.push(path.replace(/\.jsx?$/, '.ts'), path.replace(/\.jsx?$/, '.tsx'));
    if (/\.mjs$/.test(path)) candidates.push(path.replace(/\.mjs$/, '.mts'));
    if (/\.cjs$/.test(path)) candidates.push(path.replace(/\.cjs$/, '.cts'));
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs', '.cts', '.cjs']) candidates.push(path + ext, path + '/index' + ext);
    return candidates.find(p => known.has(p));
  };
  const unique = new Set<string>();
  for (const file of files) {
    let ast;
    try {
      ast = parse(file.content, { sourceType: 'unambiguous', createImportExpressions: true, plugins: [...(/\.[cm]?tsx?$/.test(file.path) ? ['typescript' as const] : []), ...(/\.jsx?$|\.tsx$/.test(file.path) ? ['jsx' as const] : [])] });
    } catch {
      graph.warnings.push({ path: file.path, message: 'Syntax could not be parsed. Outgoing dependencies from this file are unknown.' });
      continue;
    }
    const config = configs.find(c => !c.dir || file.path.startsWith(c.dir + '/'));
    const references: { specifier: string; line: number; kind: string }[] = [];
    const stack: any[] = [ast];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      let target; let kind = 'import';
      if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)) {
        target = node.source; kind = node.type.startsWith('Export') ? 're-export' : node.importKind === 'type' ? 'type import' : 'import';
      } else if (node.type === 'ImportExpression') { target = node.source; kind = 'dynamic import'; }
      else if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && node.callee.name === 'require') { target = node.arguments[0]; kind = 'require'; }
      else if (node.type === 'TSExternalModuleReference') { target = node.expression; kind = 'type import'; }
      if (target?.type === 'StringLiteral') references.push({ specifier: target.value, line: node.loc?.start.line ?? 1, kind });
      else if (target) graph.dynamicCount++;
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'comments', 'tokens', 'extra'].includes(key)) continue;
        if (Array.isArray(value)) stack.push(...value);
        else if (value && typeof value === 'object') stack.push(value);
      }
    }
    for (const ref of references) {
      const raw = ref.specifier;
      // Asset/query-loader dependencies are outside this source-module graph.
      if (/\.(css|scss|sass|less|json|svg|png|jpg|jpeg|gif|webp|woff2?|wasm)(?:\?|$)/i.test(raw) || raw.includes('?')) { graph.assetCount++; continue; }
      let target: string | undefined;
      let local = raw.startsWith('.');
      if (local) target = resolve(directory(file.path) + '/' + raw);
      else {
        const base = normalize((config?.dir ?? '') + '/' + (config?.options.baseUrl ?? '.')) ?? '';
        const entries = Object.entries(config?.options.paths ?? {}).sort(([a], [b]) => Number(b === raw) - Number(a === raw) || b.indexOf('*') - a.indexOf('*'));
        for (const [alias, values] of entries) {
          const star = alias.indexOf('*');
          const matches = star < 0 ? alias === raw : raw.startsWith(alias.slice(0, star)) && raw.endsWith(alias.slice(star + 1));
          if (!matches || !Array.isArray(values)) continue;
          local = true;
          const match = star < 0 ? '' : raw.slice(star, raw.length - (alias.length - star - 1));
          for (const value of values) if (typeof value === 'string') { target = resolve(base + '/' + value.replace('*', match)); if (target) break; }
          break;
        }
        if (!local && config?.options.baseUrl) target = resolve(base + '/' + raw);
        if (!target && /^[@~]\//.test(raw)) local = true;
      }
      if (target) {
        const id = file.path + '\0' + target;
        if (!unique.has(id)) { unique.add(id); graph.edges.push({ from: file.path, to: target, line: ref.line, kind: ref.kind }); }
      } else if (local) graph.unresolved.push({ path: file.path, specifier: raw, line: ref.line });
      else graph.externalCount++;
    }
  }
  graph.edges.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  // Tarjan's strongly connected components identify cyclic groups, not imagined failures.
  const adjacency = new Map(graph.files.map(p => [p, graph.edges.filter(e => e.from === p).map(e => e.to)]));
  let index = 0; const indices = new Map<string, number>(), low = new Map<string, number>();
  const stack: string[] = [], active = new Set<string>();
  function visit(path: string) {
    indices.set(path, index); low.set(path, index++); stack.push(path); active.add(path);
    for (const target of adjacency.get(path) ?? []) {
      if (!indices.has(target)) { visit(target); low.set(path, Math.min(low.get(path)!, low.get(target)!)); }
      else if (active.has(target)) low.set(path, Math.min(low.get(path)!, indices.get(target)!));
    }
    if (low.get(path) === indices.get(path)) {
      const group: string[] = []; let next: string;
      do { next = stack.pop()!; active.delete(next); group.push(next); } while (next !== path);
      if (group.length > 1 || adjacency.get(path)?.includes(path)) graph.cycles.push(group.sort());
    }
  }
  graph.files.forEach(path => { if (!indices.has(path)) visit(path); });
  return graph;
}


