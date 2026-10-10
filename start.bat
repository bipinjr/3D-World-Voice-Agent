@echo off
cd /d "%~dp0"
if not exist node_modules (echo Installing... & call npm install)
call npm run build
echo Command the Future is running. Close this window to stop.
call npm run preview
