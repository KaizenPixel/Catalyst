import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildImpactGraph } from '../lib/impact.ts';
import { traceImpact, impactMarkdown } from '../lib/impact-tools.ts';
const file = (path, content = '') => ({ path, content });

test('impact follows reverse imports, deduplicates diamonds, and keeps shortest evidence paths', () => {
 const g = buildImpactGraph([file('core.ts', 'export const value = 1'), file('a.ts', "export * from './core'"), file('b.ts', "import './core'"), file('app.ts', "import './a'; import './b'; import './core'"), file('isolated.ts')]);
 const affected = traceImpact(g, 'core.ts');
 assert.equal(affected.length, 3);
 assert.deepEqual(affected.find(a => a.path === 'app.ts').chain, ['app.ts', 'core.ts']);
 assert.equal(traceImpact(g, 'app.ts').length, 0);
 assert.equal(g.edges.length, 5);
});
test('cycles terminate without counting the selected file as its own impact', () => {
 const g = buildImpactGraph([file('a.js', "import './b'"), file('b.js', "import './a'"), file('c.js', "import './b'"), file('self.js', "import './self'")]);
 assert.deepEqual(g.cycles, [['a.js', 'b.js'], ['self.js']]);
 assert.deepEqual(traceImpact(g, 'a.js').map(a => a.path), ['b.js', 'c.js']);
});
test('JSX, TS assertions, literal dynamic imports and CommonJS resolve; comments and strings do not', () => {
 const g = buildImpactGraph([file('a.ts', "const value = <string>'x'; const x = import('./b.js'); // import './fake'\nconst s = \"require('./fake')\";"), file('b.ts', 'export const b = 1'), file('view.jsx', "const x = require('./b'); export default <div/>;"), file('dynamic.js', 'import(variable);')]);
 assert.equal(g.warnings.length, 0); assert.equal(g.edges.length, 2); assert.equal(g.dynamicCount, 1); assert.equal(g.unresolved.length, 0);
});
test('JSONC aliases, baseUrl, index files, scoped packages and unresolved local paths remain distinct', () => {
 const g = buildImpactGraph([file('tsconfig.json', '{ // aliases\n "compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]},},}'), file('src/main.ts', "import '@/utils'; import '@scope/package'; import './missing'; import './style.css'"), file('src/utils/index.ts')]);
 assert.equal(g.edges[0].to, 'src/utils/index.ts'); assert.equal(g.externalCount, 1); assert.equal(g.assetCount, 1); assert.equal(g.unresolved.length, 1);
});
test('closest config wins, explicit alias beats wildcard, and Windows paths normalize', () => {
 const g = buildImpactGraph([file('tsconfig.json', '{"compilerOptions":{"paths":{"@/*":["root/*"]}}}'), file('nested/tsconfig.json', '{"compilerOptions":{"paths":{"@/*":["lib/*"],"@/x":["exact.ts"]}}}'), file('nested\\main.ts', "import '@/x'"), file('nested/exact.ts'), file('nested/lib/x.ts'), file('root/x.ts')]);
 assert.equal(g.edges[0].to, 'nested/exact.ts');
});
test('parse failures and inherited aliases are disclosed without exposing source', () => {
 const g = buildImpactGraph([file('tsconfig.json', '{"extends":"./base.json"}'), file('broken.ts', 'const secret = "DO_NOT_EXPORT_THIS"; export {'), file('main.py', 'print(1)'), file('valid.ts', "import './broken'" )]);
 assert.equal(g.warnings.length, 2); assert.equal(g.files.length, 2); assert.equal(g.edges.length, 1);
 const report = impactMarkdown(g, 'broken.ts', 'project');
 assert.ok(!report.includes('DO_NOT_EXPORT_THIS')); assert.ok(report.includes('valid.ts → broken.ts'));
});
test('assets and packages cannot create false dependency links, and imports cannot escape the root', () => {
 const g = buildImpactGraph([file('main.js', "import '../outside'; import 'react'; import './data.json'; import './view?raw'"), file('data.json', '{}'), file('view.js')]);
 assert.equal(g.edges.length, 0); assert.equal(g.unresolved.length, 1); assert.equal(g.assetCount, 2); assert.equal(g.externalCount, 1);
});
test('empty and Python-only snapshots produce an empty graph, never example data', () => {
 assert.equal(buildImpactGraph([]).files.length, 0);
 assert.equal(buildImpactGraph([file('main.py', 'import os')]).edges.length, 0);
});
