@echo off
echo QueueBit Version Update
echo =======================
echo.
echo Current version:
call npm version --json | findstr "queuebit"
echo.
echo Select version update type:
echo 1. Patch (1.0.0 -> 1.0.1)
echo 2. Minor (1.0.0 -> 1.1.0)
echo 3. Major (1.0.0 -> 2.0.0)
echo 4. Custom version
echo 5. Cancel
echo.

set /p choice="Enter choice (1-5): "

if "%choice%"=="1" (
    call npm version patch
    goto :done
)
if "%choice%"=="2" (
    call npm version minor
    goto :done
)
if "%choice%"=="3" (
    call npm version major
    goto :done
)
if "%choice%"=="4" (
    set /p version="Enter version (e.g., 1.2.3): "
    call npm version %version%
    goto :done
)
if "%choice%"=="5" (
    echo Cancelled.
    goto :end
)

echo Invalid choice.
goto :end

:done
echo.
echo Version updated successfully!
echo New version:
call npm version --json | findstr "queuebit"

:end
pause
