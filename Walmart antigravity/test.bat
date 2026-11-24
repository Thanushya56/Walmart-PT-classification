@echo off
set ELECTRON_RUN_AS_NODE=1
set NODE_PATH=C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\resources\app\node_modules
echo Running RBAC and Security Test Suite...
"C:\Users\Dell\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe" tests\rbac_security.test.js
pause
