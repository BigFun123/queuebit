@echo off
echo Publishing QueueBit to NPM with 2FA...
echo.

REM Check if logged into NPM
call npm whoami >nul 2>&1
if errorlevel 1 (
    echo You are not logged into NPM.
    echo Please run: npm login
    pause
    exit /b 1
)

echo Logged in as:
call npm whoami
echo.

REM Run tests
echo Running tests...
call npm test
if errorlevel 1 (
    echo Tests failed! Aborting publish.
    pause
    exit /b 1
)
echo.

REM Get OTP from user
set /p otp="Enter your 2FA code from authenticator app: "
if "%otp%"=="" (
    echo No OTP provided!
    pause
    exit /b 1
)

REM Publish with OTP
echo Publishing with 2FA code...
call npm publish --otp=%otp%

if errorlevel 1 (
    echo.
    echo Publish failed!
    echo Make sure your 2FA code is correct and hasn't expired.
    echo.
    pause
    exit /b 1
)

echo.
echo Successfully published to NPM!
pause
