@echo off
title PM Tracker Web — Deploy to Vercel
cd /d "%~dp0"
echo.
echo  =============================================
echo   Deploying PM Task Tracker to Vercel...
echo  =============================================
echo.

:: Install dependencies if needed
if not exist "node_modules" (
  echo  Installing dependencies...
  call npm install
)

echo  Launching Vercel deployment...
echo  A browser link will open to sign in to Vercel (free account)
echo.
call npx vercel --yes

echo.
echo  Deployment complete! Your app URL is shown above.
echo  Next step: add environment variables in the Vercel dashboard.
pause
