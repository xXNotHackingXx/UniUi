@echo off
echo Setting up uniui.local domain...

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script requires administrator privileges.
    echo Please right-click and select "Run as administrator".
    pause
    exit /b 1
)

set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts

findstr /C:"uniui.local" %HOSTS_FILE% >nul
if %errorLevel% equ 0 (
    echo uniui.local is already in your hosts file.
) else (
    echo 127.0.0.1 uniui.local >> %HOSTS_FILE%
    if %errorLevel% equ 0 (
        echo Successfully added uniui.local to your hosts file.
    ) else (
        echo Failed to add uniui.local to your hosts file.
        echo Please check your permissions or add it manually.
    )
)

echo.
echo Done! You can now access the application at http://uniui.local
echo.
pause 