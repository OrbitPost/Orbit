@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" goto missing
if not exist "dist\index.html" goto missing
start "" "%~dp0node_modules\electron\dist\electron.exe" .
exit /b 0

:missing
echo Orbit needs its local dependencies and renderer build.
echo From this folder, run npm.cmd install and npm.cmd run build.
pause
exit /b 1
