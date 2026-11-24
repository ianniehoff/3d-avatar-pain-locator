@echo off
cd /d "%~dp0"
echo Getting the latest version from GitHub...
git pull --ff-only || echo (Could not update automatically, starting with your current files. Run "Sync from GitHub.bat" to see why.)
start "3D Avatar Dev Server" cmd /k npm run dev
timeout /t 3 /nobreak >nul
start chrome http://localhost:5173
