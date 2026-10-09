import type { Finding } from './analyzer';

export function compareFindings(before: Finding[], after: Finding[]) {
  return {
    resolved: before.filter(f => !after.some(n => n.id === f.id)),
    introduced: after.filter(f => !before.some(n => n.id === f.id)),
  };
}
export function reviewMarkdown(name: string, report: { passed: number; total: number; findings: Finding[] }) {
  const lines = [
    '# Catalyst project review', '',
    'Project: ' + name.replace(/[\r\n]/g, ' '),
    'Mode: Local folder snapshot',
    'Checks passed: ' + report.passed + '/' + report.total, '',
    'Rule-based findings from imported files. Source contents and credential values are not included.', '',
    '## Findings', '',
    ...report.findings.map((f, i) => (i + 1) + '. **' + f.title + '** — ' + f.severity + ' priority\n   - Location: ' + f.location + '\n   - Category: ' + f.category),
    ...(report.findings.length ? [] : ['All applicable checks passed.']), '',
    '## Coverage limits', '',
    'Checks are heuristics. File presence does not prove tests or CI pass. No project code is executed. Git history, full dependency vulnerabilities, and AST analysis are not covered. A passing review is not proof of correctness or security.',
  ];
  return lines.join('\n');
}
