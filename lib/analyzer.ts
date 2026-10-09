export type ProjectFile = {
    path: string;
    content: string;
};
export type Finding = {
    id: string;
    title: string;
    category: string;
    severity: 'High' | 'Medium' | 'Low';
    location: string;
};
/** Educational heuristics only. Does not execute code or expose credential values. */
export function analyze(input: ProjectFile[]) {
    const files = input.map(f => ({ ...f, path: f.path.replace(/\\/g, '/') }));
    const has = (r: RegExp) => files.some(f => r.test(f.path));
    const python = has(/\.py$|(^|\/)(pyproject\.toml|requirements[^/]*\.txt)$/i);
    const js = has(/\.[cm]?jsx?$|\.tsx?$|(^|\/)package\.json$/i);
    const findings: Finding[] = [];
    let total = 0;
    const check = (pass: boolean, f: Finding) => {
        total++;
        if (!pass)
            findings.push(f);
    };
    const secret = files.filter(f => /\.(py|[cm]?jsx?|tsx?|json|ya?ml)$|(^|\/)\.env(?:\.|$)/i.test(f.path)).map(f => ({ path: f.path, line: f.content.split(/\r?\n/).findIndex(l => /(?:api[_-]?key|secret(?:[_-]?key)?|password|access[_-]?token)\s*["']?\s*[:=]\s*["'][^"'\r\n]{8,}["']/i.test(l) || /^\s*(?:API_KEY|SECRET_KEY|PASSWORD|ACCESS_TOKEN)\s*=\s*[^\s#]{8,}\s*$/i.test(l)) })).find(f => f.line >= 0);
    check(!secret, { id: 'secrets', title: 'Keep credentials out of your code', category: 'Security', severity: 'High', location: secret ? `${secret.path}:${secret.line + 1} · value hidden` : 'Source configuration' });
    const ignore = files.find(f => f.path === '.gitignore');
    check(Boolean(ignore && /^(?:\/)?\.env(?:\*|\/)?\s*$/m.test(ignore.content)), { id: 'gitignore', title: 'Protect your local environment file', category: 'Version control', severity: 'High', location: ignore ? '.gitignore · no basic .env exclusion found' : '.gitignore is missing' });
    const tests = files.some(f => /\.(py|[cm]?[jt]sx?)$/i.test(f.path) && /(^|\/)(__tests__|tests?|spec)\/|(^|\/)test_[^/]+\.py$|(?:\.test|\.spec)\.[cm]?[jt]sx?$|_test\.py$/i.test(f.path));
    check(tests, { id: 'tests', title: 'Give your core behavior a test', category: 'Testing', severity: 'Medium', location: 'No conventional test files found' });
    const readme = files.find(f => /(^|\/)readme(?:\.md|\.txt)?$/i.test(f.path));
    check(Boolean(readme && /\b(install|setup|getting started)\b/i.test(readme.content) && /\b(test|tests|testing)\b/i.test(readme.content)), { id: 'readme', title: 'Make your project easy to run', category: 'Documentation', severity: 'Medium', location: readme?.path ?? 'README.md is missing' });
    const manifests = files.filter(f => /(^|\/)package\.json$/.test(f.path));
    const invalidPaths: string[] = [], floatingPaths: string[] = [];
    for (const f of manifests) {
        try {
            const p = JSON.parse(f.content);
            if (!p || typeof p !== 'object' || Array.isArray(p))
                invalidPaths.push(f.path);
            else
                if (Object.values({ ...p.dependencies, ...p.devDependencies }).some(v => typeof v === 'string' && /^(\*|latest|next|)$/.test(v.trim()))) floatingPaths.push(f.path);
        }
        catch {
            invalidPaths.push(f.path);
        }
    }
    if (manifests.length)
        check(!invalidPaths.length, { id: 'manifest', title: 'Repair your package manifest', category: 'Configuration', severity: 'High', location: invalidPaths.join(', ') });
    if (js && manifests.length) {
        check(!floatingPaths.length, { id: 'dependencies', title: 'Avoid unrestricted dependency versions', category: 'Dependencies', severity: 'Medium', location: floatingPaths.join(', ') });
        check(has(/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/), { id: 'lockfile', title: 'Make dependency installs repeatable', category: 'Dependencies', severity: 'Medium', location: 'No supported JavaScript lockfile found' });
    }
    const req = files.filter(f => /(^|\/)requirements[^/]*\.txt$/.test(f.path));
    if (req.length)
        check(req.every(f => f.content.split(/\r?\n/).filter(l => l.trim() && !/^\s*(#|-)/.test(l)).every(l => /==|~=|>=|<=| @ /.test(l))), { id: 'python-dependencies', title: 'Constrain your Python dependencies', category: 'Dependencies', severity: 'Medium', location: 'requirements*.txt' });
    check(has(/^\.github\/workflows\/[^/]+\.ya?ml$/), { id: 'ci', title: 'Run your checks on every change', category: 'Automation', severity: 'Low', location: 'No GitHub Actions workflow found in this snapshot' });
    const ranks = { High: 0, Medium: 1, Low: 2 };
    findings.sort((a, b) => ranks[a.severity] - ranks[b.severity]);
    const passed = total - findings.length;
    const stage = !has(/\.(py|[cm]?jsx?|tsx?)$/i) ? 'Setup' : secret ? 'Security' : !tests ? 'Testing' : findings.some(f => ['manifest', 'dependencies', 'python-dependencies'].includes(f.id)) ? 'Development' : 'Deployment';
    return { findings, total, passed, score: Math.round(passed / total * 100), stage, language: python && js ? 'Python + JavaScript / TypeScript' : python ? 'Python' : js ? 'JavaScript / TypeScript' : 'General project' };
}

