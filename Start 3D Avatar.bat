@echo off
cd /d "%~dp0"
start "3D Avatar Dev Server" cmd /k npm run dev
timeout /t 3 /nobreak >nul
start chrome http://localhost:5173
