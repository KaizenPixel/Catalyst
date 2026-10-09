import type { ProjectFile } from './analyzer';

export type ImportSummary = { selected: number; excluded: number; skipped: number };
export type FolderFile = { name: string; webkitRelativePath: string; size: number; text: () => Promise<string> };
const ignoredDirectory = /(^|\/)(node_modules|\.git|\.venv|venv|dist|build|coverage|__pycache__|\.next|\.wrangler)(\/|$)/i;
const supportedFile = /(?:\.(?:py|[cm]?[jt]s|jsx|tsx|json|md|txt|toml|ya?ml|lock)|^(?:\.gitignore|Dockerfile|\.env(?:\.[\w.-]+)?))$/i;

export async function readProjectFolder(all: FolderFile[], onProgress: (read: number, total: number) => void = () => {}) {
  if (!all.length) throw new Error('Select a project folder first.');
  const name = all[0].webkitRelativePath.split('/')[0];
  if (!name || !all[0].webkitRelativePath.includes('/')) throw new Error('Select a folder so the project name and relative paths are available.');
  if (all.some(f => !f.webkitRelativePath.startsWith(name + '/'))) throw new Error('Select one project folder at a time.');
  const eligible = all.filter(f => !ignoredDirectory.test(f.webkitRelativePath.slice(name.length + 1)) && supportedFile.test(f.name));
  if (!eligible.length) throw new Error('No supported files found. Choose a Python, JavaScript, or TypeScript project.');
  if (eligible.length > 500 || eligible.reduce((n, f) => n + f.size, 0) > 10000000) throw new Error('Choose a project with at most 500 supported files and 10 MB of supported content.');
  const files: ProjectFile[] = [];
  let skipped = 0;
  onProgress(0, eligible.length);
  for (const [index, file] of eligible.entries()) {
    if (file.size > 250000) skipped++;
    else files.push({ path: file.webkitRelativePath.slice(name.length + 1), content: await file.text() });
    onProgress(index + 1, eligible.length);
  }
  if (!files.length) throw new Error('All supported files exceed the 250 KB per-file limit.');
  return { name, files, summary: { selected: all.length, excluded: all.length - eligible.length, skipped } };
}

