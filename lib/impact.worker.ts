import { buildImpactGraph } from './impact';
import type { ProjectFile } from './analyzer';

self.onmessage = (event: MessageEvent<ProjectFile[]>) => {
  try { self.postMessage({ graph: buildImpactGraph(event.data) }); }
  catch { self.postMessage({ error: 'The dependency map could not be built. Try a smaller source folder.' }); }
};
