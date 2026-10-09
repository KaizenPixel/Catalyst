@echo off
cd /d "%~dp0"
echo Starting Catalyst. Keep this window open during your demonstration.
echo Open http://127.0.0.1:3001 in your browser after the server is ready.
call npm run dev -- --port 3001
pause
