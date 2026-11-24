@echo off
cd /d "%~dp0"
echo Syncing with GitHub (files and history)...
git pull --ff-only
echo.
echo Latest commits:
git log --oneline -8
echo.
pause
