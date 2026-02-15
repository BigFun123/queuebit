@echo off
echo Publishing QueueBit to NPM...
echo.

REM Check if logged into NPM
call npm whoami >nul 2>&1
if errorlevel 1 (
    echo You are not logged into NPM.
    echo.
    echo Please run one of the following:
    echo   1. npm login
    echo   2. npm adduser
    echo.
    pause
    exit /b 1
)

echo Logged in as:
call npm whoami
echo.

REM Check package name availability
echo Checking if package name is available...
call npm view queuebit version >nul 2>&1
if not errorlevel 1 (
    echo.
    echo WARNING: Package 'queuebit' already exists on NPM!
    echo You may need to:
    echo   1. Use a different package name in package.json
    echo   2. Or increment the version number if you own this package
    echo.
    pause
)

REM Run tests before publishing
echo Running tests...
call npm test
if errorlevel 1 (
    echo Tests failed! Aborting publish.
    pause
    exit /b 1
)
echo.

REM Show what will be published
echo Checking package contents (dry run)...
call npm publish --dry-run
if errorlevel 1 (
    echo Dry-run failed! Please fix errors before publishing.
    pause
    exit /b 1
)
echo.

REM Confirm publish
set /p confirm="Ready to publish. Continue? (y/n): "
if /i not "%confirm%"=="y" (
    echo Publish cancelled.
    pause
    exit /b 0
)

REM Publish to NPM
echo.
echo Publishing package...
echo.
echo NOTE: If you get a 2FA error, you may need to:
echo   1. Enable 2FA on your npm account
echo   2. Use: npm publish --otp=YOUR_2FA_CODE
echo   3. Or create an automation token at: https://www.npmjs.com/settings/~/tokens
echo.

call npm publish
if errorlevel 1 (
    echo.
    echo Publish failed!
    echo.
    echo Common solutions:
    echo   1. If 2FA error: Run 'npm publish --otp=YOUR_2FA_CODE'
    echo   2. If name taken: Change package name in package.json
    echo   3. If version exists: Update version in package.json
    echo   4. If not logged in: Run 'npm login'
    echo.
    pause
    exit /b 1
)

echo.
echo Successfully published to NPM!
echo.
pause
