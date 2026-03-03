@echo off
echo Installing dependencies...
call npm install
echo.
echo Starting QueueBit browser example...
echo - Vite dev server on http://localhost:5173
echo.
call npm run dev
