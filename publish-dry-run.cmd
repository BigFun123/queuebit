@echo off
echo Running NPM publish dry-run...
echo.

REM Run tests before dry-run
echo Running tests...
call npm test
if errorlevel 1 (
    echo Tests failed!
    exit /b 1
)
echo.

REM Show what would be published
echo Checking package contents...
call npm publish --dry-run
if errorlevel 1 (
    echo Dry-run failed!
    exit /b 1
)

echo.
echo Dry-run completed successfully!
echo This shows what would be published to NPM.
pause
