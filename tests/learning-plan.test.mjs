import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePlan, learningPlanMarkdown } from '../lib/learning-plan.ts';

const finding = (id, location = 'src/main.ts') => ({ id, location, title: `Finding ${id}`, category: 'Testing', severity: 'Medium' });
test('re-reviews retain notes and working state, refresh evidence, and add new findings', () => {
  const previous = [{ finding: finding('a'), stage: 'working', note: 'My explanation' }];
  const next = reconcilePlan(previous, [finding('a', 'src/new.ts'), finding('b')], false);
  assert.equal(next[0].note, 'My explanation');
  assert.equal(next[0].stage, 'working');
  assert.equal(next[0].finding.location, 'src/new.ts');
  assert.equal(next[1].stage, 'queued');
  assert.equal(previous[0].finding.location, 'src/main.ts');
});
test('only complete snapshots clear absent findings; recurring findings reopen with notes', () => {
  const previous = [{ finding: finding('a'), stage: 'ready', note: 'Added a regression test' }];
  assert.equal(reconcilePlan(previous, [], true)[0].stage, 'ready');
  const cleared = reconcilePlan(previous, [], false);
  assert.equal(cleared[0].stage, 'cleared');
  const reopened = reconcilePlan(cleared, [finding('a')], false);
  assert.equal(reopened[0].stage, 'queued');
  assert.equal(reopened[0].note, previous[0].note);
});
test('journal exports actual evidence and user notes with the limits of clearance', () => {
  const output = learningPlanMarkdown('my-project', [{ finding: finding('a'), stage: 'cleared', note: 'Verified the failure first.\nThen fixed it.' }]);
  assert.match(output, /Project: my-project/);
  assert.match(output, /Evidence: src\/main.ts/);
  assert.match(output, /Status: No longer detected/);
  assert.match(output, /Verified the failure first\.\nThen fixed it\./);
  assert.match(output, /does not prove correctness/);
  assert.equal(reconcilePlan([], [], false).length, 0);
});
