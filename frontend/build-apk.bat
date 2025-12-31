@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   LazySpender APK Builder
echo ============================================
echo.

:: Navigate to frontend directory
cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [1/4] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        exit /b 1
    )
) else (
    echo [1/4] Dependencies already installed, skipping...
)

:: Export the Expo project to native code
echo.
echo [2/4] Exporting Expo project...
call npx expo prebuild --platform android
if errorlevel 1 (
    echo ERROR: Failed to export Expo project
    exit /b 1
)

:: Navigate to android directory
cd android

:: Build the APK
echo.
echo [3/4] Building APK (this may take a few minutes)...
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo.
    echo Release build failed, trying debug build...
    call gradlew.bat assembleDebug
    if errorlevel 1 (
        echo ERROR: Failed to build APK
        exit /b 1
    )
    set "APK_PATH=app\build\outputs\apk\debug\app-debug.apk"
    set "BUILD_TYPE=debug"
) else (
    set "APK_PATH=app\build\outputs\apk\release\app-release.apk"
    set "BUILD_TYPE=release"
)

:: Check if APK was created
if exist "!APK_PATH!" (
    echo.
    echo ============================================
    echo   BUILD SUCCESSFUL!
    echo ============================================
    echo.
    echo [4/4] APK Location:
    echo   %cd%\!APK_PATH!
    echo.
    echo Build type: !BUILD_TYPE!
    echo.

    :: Open the folder containing the APK
    explorer /select,"!APK_PATH!"
) else (
    echo.
    echo ERROR: APK file not found at expected location
    exit /b 1
)

endlocal
