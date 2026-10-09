import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/analyzer.ts';
import { sampleFiles } from './project-fixture.ts';
test('sample review prioritizes credentials and never reveals their value',()=>{const r=analyze(sampleFiles);assert.equal(r.findings[0].id,'secrets');assert.equal(r.findings[0].location,'src/server.js:3 · value hidden');assert.ok(!JSON.stringify(r).includes('example-demo-value-only'));assert.equal(r.passed+r.findings.length,r.total);});
test('remediating a project improves score and resolves findings',()=>{const files=sampleFiles.map(f=>({...f}));files.find(f=>f.path==='src/server.js').content='const API_KEY = process.env.API_KEY;';files.find(f=>f.path==='.gitignore').content='.env\nnode_modules/';files.find(f=>f.path==='package.json').content='{"dependencies":{"express":"^5.1.0"}}';files.find(f=>f.path==='README.md').content='# Setup\nInstall dependencies.\n## Tests\nRun tests.';files.push({path:'tests/tasks.test.js',content:'test scaffold'},{path:'package-lock.json',content:'{}'},{path:'.github/workflows/test.yml',content:'name: tests'});const r=analyze(files);assert.equal(r.score,100);assert.equal(r.findings.length,0);});
test('malformed manifests produce a finding instead of crashing',()=>{for(const content of ['{broken','null','[]'])assert.ok(analyze([{path:'package.json',content}]).findings.some(f=>f.id==='manifest'));});
test('Python projects get appropriate dependency checks',()=>{const r=analyze([{path:'main.py',content:'print("hello")'},{path:'requirements.txt',content:'requests\n'},{path:'tests/test_main.py',content:''}]);assert.equal(r.language,'Python');assert.ok(r.findings.some(f=>f.id==='python-dependencies'));assert.ok(!r.findings.some(f=>f.id==='lockfile'));assert.ok(!r.findings.some(f=>f.id==='tests'));});
test('empty projects are classified as setup and scores remain bounded',()=>{const r=analyze([]);assert.equal(r.stage,'Setup');assert.ok(r.score>=0&&r.score<=100);});
test('Windows paths normalize before pattern checks',()=>{assert.ok(!analyze([{path:'src\\tasks.test.ts',content:''}]).findings.some(f=>f.id==='tests'));});
import { compareFindings, reviewMarkdown } from '../lib/review-tools.ts';
test('comparisons reflect resolved and introduced checks',()=>{const before=analyze(sampleFiles);const after=analyze(sampleFiles.map(f=>f.path==='.gitignore'?{...f,content:'.env'}:f));const diff=compareFindings(before.findings,after.findings);assert.deepEqual(diff.resolved.map(f=>f.id),['gitignore']);assert.equal(diff.introduced.length,0);});

test('review export includes evidence and excludes source secrets',()=>{const md=reviewMarkdown('project',analyze(sampleFiles));assert.ok(md.includes('src/server.js:3'));assert.ok(md.includes('Local folder snapshot'));assert.ok(!md.includes('example-demo-value-only'));});
test('documentation inside a tests folder is not an executable test file',()=>{assert.ok(analyze([{path:'tests/README.md',content:'Testing guide'}]).findings.some(f=>f.id==='tests'));});
test('credentials take precedence when suggesting lifecycle focus',()=>{assert.equal(analyze(sampleFiles).stage,'Security');});
test('nested manifest findings cite the affected paths',()=>{
 const result=analyze([{path:'packages/api/package.json',content:'{"dependencies":{"express":"*"}}'},{path:'packages/web/package.json',content:'{broken'}]);
 assert.equal(result.findings.find(f=>f.id==='manifest').location,'packages/web/package.json');
 assert.equal(result.findings.find(f=>f.id==='dependencies').location,'packages/api/package.json');
});
