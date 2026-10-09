import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readProjectFolder} from '../lib/project-import.ts';
const file=(path,content='',size=content.length)=>({name:path.split('/').at(-1),webkitRelativePath:path,size,text:async()=>content});
test('import uses real paths and content while excluding generated and unsupported files',async()=>{
 const progress=[];const result=await readProjectFolder([file('my-app/src/main.ts','export const value = 1;'),file('my-app/node_modules/x/index.js','ignored'),file('my-app/.next/output.js','ignored'),file('my-app/photo.png','ignored'),file('my-app/README.md','# Project')],(read,total)=>progress.push([read,total]));
 assert.equal(result.name,'my-app');assert.deepEqual(result.files.map(f=>f.path),['src/main.ts','README.md']);assert.equal(result.files[0].content,'export const value = 1;');assert.deepEqual(result.summary,{selected:5,excluded:3,skipped:0});assert.deepEqual(progress.at(-1),[2,2]);
});
test('oversized files count as skipped and do not enter analysis',async()=>{
 const result=await readProjectFolder([file('app/main.py','print(1)'),file('app/huge.json','',250001)]);
 assert.equal(result.summary.skipped,1);assert.equal(result.files.length,1);
});
test('import rejects empty, unsupported, mixed-root, and over-limit selections',async()=>{
 await assert.rejects(()=>readProjectFolder([]),/Select/);
 await assert.rejects(()=>readProjectFolder([file('app/image.png')]),/No supported/);
 await assert.rejects(()=>readProjectFolder([file('one/main.py'),file('two/main.py')]),/one project/);
 await assert.rejects(()=>readProjectFolder(Array.from({length:501},(_,i)=>file('app/'+i+'.ts'))),/500/);
 await assert.rejects(()=>readProjectFolder([file('app/large.json','',10000001)]),/10 MB/);
});
test('read failures reject the snapshot instead of returning misleading partial findings',async()=>{
 await assert.rejects(()=>readProjectFolder([{...file('app/main.py'),text:async()=>{throw new Error('Read failed')}}]),/Read failed/);
});
