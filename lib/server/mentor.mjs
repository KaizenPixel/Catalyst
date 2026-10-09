import { z } from 'zod';

// Curated summaries, selected by deterministic finding ID. No live crawling or embeddings.
export const knowledge = {
 secrets: {title:'Keep credentials out of code',url:'https://12factor.net/config',summary:'Store deploy-specific configuration in environment variables rather than source code. A detected literal may be a harmless example. If a real credential was exposed, rotate it; moving it out of source does not invalidate the old value.'},
 gitignore: {title:'Ignore local environment files',url:'https://git-scm.com/docs/gitignore',summary:'Ignore rules affect untracked files. They do not remove already tracked files or erase repository history. Exclude .env, keep a safe .env.example, and inspect tracked state before making changes.'},
 tests: {title:'Test observable behavior',url:'https://nodejs.org/api/test.html',summary:'Test the behavior a user depends on, including a normal input and a boundary or invalid input. File-presence heuristics do not verify execution or assertions. Use the project’s existing test framework.'},
 readme: {title:'Document how to use the project',url:'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',summary:'A useful README explains project purpose, setup, usage, and testing. Verify commands before documenting them. If tests do not exist yet, say so. Do not invent installation commands or dependencies.'},
 manifest: {title:'Repair a package manifest',url:'https://docs.npmjs.com/cli/configuring-npm/package-json',summary:'package.json must be a JSON object. JSON requires double quotes and does not support comments or trailing commas. A parsing failure prevents reliable dependency inspection.'},
 dependencies: {title:'Constrain dependency versions',url:'https://docs.npmjs.com/cli/configuring-npm/package-json',summary:'Wildcard versions and tags can change the release selected on a fresh install. Specify a tested version or compatible range and commit the package manager’s lockfile. Never invent a latest or secure version.'},
 lockfile: {title:'Use repeatable dependency installs',url:'https://docs.npmjs.com/cli/configuring-npm/package-lock-json',summary:'A lockfile records the resolved dependency tree. Generate it using the project’s package manager and commit it with the manifest. For npm, npm ci requires a consistent existing lockfile. Do not fabricate a lockfile.'},
 'python-dependencies': {title:'Constrain Python requirements',url:'https://pip.pypa.io/en/stable/reference/requirements-file-format/',summary:'Requirements can specify versions, compatible constraints, URLs, and other supported forms. The prototype uses a limited text heuristic. Choose versions already tested in the project and verify a clean installation.'},
 ci: {title:'Automate verified checks',url:'https://docs.github.com/en/actions/get-started/quickstart',summary:'Continuous integration can run verified install and test commands on changes. Match the runtime to the project. Absence of GitHub Actions does not imply no CI, since another provider may be used. Never claim a workflow has run.'},
};
const inputSchema = z.object({
 findingId:z.string().refine(id=>Object.hasOwn(knowledge,id)),
 language:z.enum(['Python','JavaScript / TypeScript','Python + JavaScript / TypeScript','General project']),
 stage:z.enum(['Setup','Development','Testing','Security','Deployment']),
 intent:z.enum(['explain','next-step','quiz']),
}).strict();
const outputSchema=z.object({explanation:z.string().min(1).max(2200),nextStep:z.string().min(1).max(1200),checkYourUnderstanding:z.string().min(1).max(600)}).strict();
const jsonSchema={type:'object',properties:{explanation:{type:'string'},nextStep:{type:'string'},checkYourUnderstanding:{type:'string'}},required:['explanation','nextStep','checkYourUnderstanding'],additionalProperties:false};
export function configuration(env){const key=typeof env.GEMINI_API_KEY==='string'?env.GEMINI_API_KEY.trim():'';return{configured:Boolean(key),key,model:typeof env.GEMINI_MODEL==='string'&&env.GEMINI_MODEL.trim()?env.GEMINI_MODEL.trim():'gemini-3.5-flash-lite'};}
export function buildPrompt(input){
 const parsed=inputSchema.parse(input);
 const reference={...knowledge[parsed.findingId]};
 if(parsed.findingId==='tests'&&parsed.language==='Python')reference.url='https://docs.pytest.org/en/stable/getting-started.html';
 return {reference,instructions:'You are Catalyst, a patient software-development mentor for beginners. Explain one existing heuristic finding using only the supplied curated reference summary. Teach before giving a solution. You have no source code, file names, execution results, or repository access. Do not invent project details, claim a check is fixed, change a score, claim a test ran, or reproduce secrets. Acknowledge heuristic uncertainty when relevant. Keep each response under 250 words total. Give one small next step and one specific comprehension question. If intent is quiz, emphasize a question rather than giving its answer. Do not add URLs; the application displays its verified reference separately. Return the requested JSON fields.',input:JSON.stringify({finding:reference.title,language:parsed.language,stage:parsed.stage,question:parsed.intent,curatedReference:reference.summary})};
}
function json(body,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function tokenUsage(metadata) {
 const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
 return {
  input: count(metadata?.promptTokenCount), output: count(metadata?.candidatesTokenCount),
  thinking: count(metadata?.thoughtsTokenCount), cachedInput: count(metadata?.cachedContentTokenCount),
  total: count(metadata?.totalTokenCount),
 };
}
export function createMentorHandler({fetchImpl=fetch,now=()=>Date.now(),timeoutMs=45000}={}) {
 // A deliberately local-only prototype: one request at a time, five starts per minute.
 let busy=false,starts=[];
 return async function handle(request,env={}) {
  const url=new URL(request.url);
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return json({error:'AI access is limited to the local demo. Add authenticated access before hosting.'},403);
  if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Cross-origin requests are not allowed.'},403);
  const config=configuration(env);
  if(request.method==='GET')return json({configured:config.configured,model:config.model,provider:'Gemini',mode:'local-only'});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(request.headers.get('Origin')!==url.origin)return json({error:'An exact same-origin request is required.'},403);
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json({error:'Send JSON.'},415);
  if(!config.configured)return json({error:'Add GEMINI_API_KEY to .dev.vars, then restart Catalyst. Local findings remain available.',code:'not_configured'},503);
  if(Number(request.headers.get('Content-Length'))>4096)return json({error:'Request too large.'},413);
  let input;
  try {
   // Bound streamed bodies too, rather than trusting Content-Length.
   const reader=request.body?.getReader();if(!reader)return json({error:'Missing request.'},400);
   let size=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return json({error:'Request too large.'},413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   input=inputSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  }catch{return json({error:'Choose a supported finding, language, stage, and question. Raw code is not accepted.'},400);}
  const time=now();starts=starts.filter(t=>time-t<60000);
  if(busy||starts.length>=5)return json({error:busy?'A mentor response is already being generated. Try again when it finishes.':'Demo limit reached. Wait a minute before asking again.'},429);
  busy=true;starts.push(time);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try {
   const prompt=buildPrompt(input);
   const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{method:'POST',headers:{'x-goog-api-key':config.key,'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({systemInstruction:{parts:[{text:prompt.instructions}]},contents:[{role:'user',parts:[{text:prompt.input}]}],generationConfig:{...(config.model==='gemini-3.5-flash-lite'?{thinkingConfig:{thinkingLevel:'MINIMAL'}}:{}),maxOutputTokens:4096,responseMimeType:'application/json',responseJsonSchema:jsonSchema}})});
   if(!response.ok){const status=response.status;return json({error:status===401||status===403?'The Gemini key or API access was rejected. Check the server configuration.':status===429?'Gemini quota or rate limit reached. Check API billing or try again later.':status===400||status===404?'The Gemini key, configured model, or request was rejected. Check GEMINI_API_KEY, GEMINI_MODEL, and model access.':'The AI provider is unavailable. Please try again later.'},status===429?429:502);}
   const data=await response.json();
   const candidate=data.candidates?.[0];
   if(data.promptFeedback?.blockReason||['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII'].includes(candidate?.finishReason))return json({error:'The model declined this request. Local findings remain available.'},422);
   if(candidate?.finishReason!=='STOP')return json({error:'The AI response was incomplete. Please try again.'},502);
   const content=Array.isArray(candidate.content?.parts)?candidate.content.parts:[];
   const text=content.filter(c=>!c.thought&&typeof c.text==='string').map(c=>c.text).join('');
   const answer=outputSchema.parse(JSON.parse(text));
   return json({answer,reference:{title:prompt.reference.title,url:prompt.reference.url},model:config.model,provider:'Gemini',usage:tokenUsage(data.usageMetadata)});
  }catch(error){return json({error:controller.signal.aborted?'The AI request timed out. Try again; your local findings remain available.':'The AI response could not be validated. Please try again.'},controller.signal.aborted?504:502);}
  finally{clearTimeout(timeout);busy=false;}
 };
}
export const handleMentorRequest=createMentorHandler();
