@echo off
cd /d "%~dp0"
echo Starting Command the Future at http://localhost:8080  (close this window to stop)
start "" http://localhost:8080
python -m http.server 8080
