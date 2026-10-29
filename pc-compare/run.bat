@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py server\server.py
  goto end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python server\server.py
  goto end
)
echo Python topilmadi. https://www.python.org/downloads/ dan o'rnating ^("Add Python to PATH" belgisini qo'ying^).
:end
pause
