@echo off
echo NPM Authentication Setup Helper
echo ================================
echo.

REM Check current status
call npm whoami >nul 2>&1
if not errorlevel 1 (
    echo You are already logged in as:
    call npm whoami
    echo.
    set /p reauth="Do you want to re-authenticate? (y/n): "
    if /i not "%reauth%"=="y" (
        echo Setup cancelled.
        pause
        exit /b 0
    )
)

echo.
echo Choose authentication method:
echo.
echo 1. Interactive login (opens browser)
echo 2. Legacy login (username/password in terminal)
echo 3. Create automation token (for CI/CD)
echo 4. Cancel
echo.

set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    echo.
    echo Opening browser for authentication...
    call npm login
    goto :done
)

if "%choice%"=="2" (
    echo.
    echo Using legacy authentication...
    call npm login --auth-type=legacy
    goto :done
)

if "%choice%"=="3" (
    echo.
    echo To create an automation token:
    echo 1. Go to: https://www.npmjs.com/settings/~/tokens
    echo 2. Click "Generate New Token"
    echo 3. Select "Automation" type
    echo 4. Copy the token
    echo 5. Run: npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
    echo.
    start https://www.npmjs.com/settings/~/tokens
    pause
    goto :end
)

if "%choice%"=="4" (
    echo Setup cancelled.
    goto :end
)

echo Invalid choice.
goto :end

:done
echo.
echo Authentication complete!
echo.
echo Checking status...
call npm whoami

if errorlevel 1 (
    echo.
    echo Authentication failed. Please try again.
) else (
    echo.
    echo You can now publish packages.
    echo.
    echo Next steps:
    echo   1. Run update-version.cmd to update version if needed
    echo   2. Run publish.cmd to publish
    echo   3. If 2FA is enabled, use publish-with-otp.cmd instead
)

:end
pause
