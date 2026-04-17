@echo off
echo.
echo ========================================
echo  ADMIN PANEL MODERNIZATION SCRIPT
echo ========================================
echo.
echo This will update all admin pages to use
echo modern DataTable components.
echo.
pause

cd /d "%~dp0"
node modernize-all-pages.js

echo.
echo Press any key to exit...
pause > nul
