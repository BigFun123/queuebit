@echo off
echo Publishing QueueBit to NPM...
echo.

REM Check if logged into NPM
call npm whoami >nul 2>&1
if errorlevel 1 (
    echo You are not logged into NPM.
    echo Please run: npm login
    exit /b 1
)

echo Logged in as:
call npm whoami
echo.

REM Run tests before publishing
echo Running tests...
call npm test
if errorlevel 1 (
    echo Tests failed! Aborting publish.
    exit /b 1
)
echo.

REM Publish to NPM
echo Publishing package...
call npm publish
if errorlevel 1 (
    echo Publish failed!
    exit /b 1
)

echo.
echo Successfully published to NPM!
pause
