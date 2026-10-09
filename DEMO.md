# Demonstrating Catalyst with your project

## Before the meeting

Start Catalyst with Start-Catalyst.cmd. Use a real, small JavaScript/TypeScript or Python project and select its root folder, including its manifest and README. Avoid selecting only src or app: missing root files would correctly be reported as absent from that snapshot.

Configure Gemini as described in AI-SETUP.md. Generate one lesson before the meeting to verify account access. Key loaded is configuration status, not proof of a successful provider request.

## Walkthrough

1. Begin on the empty workspace. Explain that nothing is populated until a project folder is selected.
2. Choose your project folder. Point out actual file counts, passed checks, and findings. Results depend on the project; there is no preset score.
3. Select a finding and inspect its location. Explain that the finding comes from a deterministic check.
4. Open Impact Lab. Select a source file, choose Predict & reveal, enter a prediction, and show the direct and indirect import paths. These are computed from your files and use no Gemini tokens.
5. Return to Project review and click Explain with AI. Show LIVE RESPONSE, the generated explanation, and the actual token receipt.
6. Mark the concept understood. Explain that this records learning only.
7. Make a relevant change in your own editor. Use Review changes and select the same folder. Show the actual resolved and new findings in Review history. If no check changed, say so.
8. Use File explorer to inspect imported paths, sizes, and line counts. Export review for a Markdown record of detected findings.

## Honest scope

- Source stays in the browser. Gemini receives only bounded finding context and a server-selected reference summary.
- The model has not read the source and cannot edit it.
- Checks are heuristics. A high pass count does not prove security or correctness.
- History and learning state last for this session. Reloading clears them.
- There is no repository sync or automatic background watcher.
- If Gemini fails, show the provider error and the local findings. No canned AI answer is substituted.

## Recovery

A timeout or provider-capacity failure can be retried later. Do not repeatedly click while generation is pending. Check the server-only key and model configuration if API access fails.

If the preview reports a stale module after development edits, restart Catalyst and refresh the browser, then re-import the project.

Architecture, cost examples, and viva preparation: [PROFESSOR-GUIDE.md](PROFESSOR-GUIDE.md).

