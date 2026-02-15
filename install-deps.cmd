@echo off
echo Installing QueueBit dependencies...
echo.

call npm install

if errorlevel 1 (
    echo.
    echo Installation failed!
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
pause
