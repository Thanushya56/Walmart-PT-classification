@echo off
set ELECTRON_RUN_AS_NODE=1
set NODE_PATH=C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\resources\app\node_modules
set PORT=3001
echo Starting Walmart PT Classification Library Workspace on http://localhost:%PORT%...
"C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe" server\index.js
pause
