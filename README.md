# Catalyst

A development mentor that helps beginners understand and improve their own JavaScript, TypeScript, and Python projects.

## Features

- **Project review:** Find common issues with credentials, tests, documentation, and project configuration.
- **Gemini mentor:** Get explanations, suggested next steps, and understanding questions for a finding.
- **Impact Lab:** Explore JavaScript and TypeScript dependencies and predict which files a change could affect.
- **Learning plan:** Track tasks, write learning notes, and export a journal.
- **Review history:** Re-import an updated project to compare findings and export reports.

## How it works

Select a project folder. Catalyst checks supported files locally and displays findings with evidence. Edit your code in your editor, then select **Review changes** to compare snapshots.

Source files stay in browser memory. Gemini receives the finding type, language, review stage, and selected question through a server endpoint. The API key stays on the server. Reloading clears the imported project, notes, and history; export anything you want to keep.

## Run locally

Requires Node.js 22.13 or newer and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3001.

For Gemini, copy `.dev.vars.example` to `.dev.vars`, set `GEMINI_API_KEY`, and restart the server. Keep `.dev.vars` out of Git. Local review and Impact Lab work without a key.

## Stack

React, TypeScript, Tailwind CSS, Vinext/Vite, Cloudflare Workers, Gemini API, and Babel for dependency parsing.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

Reviews use heuristics and do not execute project code or tests. Imports support up to 500 files, 10 MB per project, and 250 KB per file. The mentor endpoint currently supports local use only.
