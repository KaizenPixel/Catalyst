import type { ProjectFile } from '../lib/analyzer';
export const sampleFiles: ProjectFile[] = [
    { path: 'package.json', content: JSON.stringify({ name: 'taskflow-api', type: 'module', scripts: { start: 'node src/server.js' }, dependencies: { express: '*', cors: '^2.8.5' } }, null, 2) },
    { path: 'src/server.js', content: 'import express from "express";\nconst app = express();\nconst API_KEY = "example-demo-value-only";\napp.use(express.json());\napp.post("/tasks", (req, res) => res.json({ title: req.body.title }));\napp.listen(3000);' },
    { path: 'src/tasks.js', content: 'export const tasks = [];\nexport function addTask(title) { tasks.push({ title, done: false }); }' },
    { path: '.gitignore', content: 'node_modules/\ndist/\n' },
    { path: 'README.md', content: '# Taskflow API\nA small project to learn Express.' }
];
