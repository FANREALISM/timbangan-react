@echo off
title REACT + CAPACITOR APK BUILDER
color 0A

echo =========================================
echo        REACT + CAPACITOR APK BUILDER
echo =========================================
echo.

:: ==============================
:: CEK NODE
:: ==============================
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js belum terinstall!
    pause
    exit
)

:: ==============================
:: CEK ANDROID SDK
:: ==============================
where adb >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Android SDK / ADB belum terinstall!
    pause
    exit
)

echo Semua dependency ditemukan ✓
echo.

:: ==============================
:: BUILD REACT
:: ==============================
echo Building React app...
call npm run build

if %errorlevel% neq 0 (
    echo ERROR saat build React!
    pause
    exit
)

echo React build sukses ✓
echo.

:: ==============================
:: SYNC CAPACITOR
:: ==============================
echo Sync ke Android...
call npx cap sync android

if %errorlevel% neq 0 (
    echo ERROR saat cap sync!
    pause
    exit
)

echo Sync sukses ✓
echo.

:: ==============================
:: BUILD APK
:: ==============================
echo Building APK Debug...
cd android
call gradlew assembleDebug

if %errorlevel% neq 0 (
    echo ERROR saat build APK!
    pause
    exit
)

echo.
echo =========================================
echo APK BERHASIL DIBUAT!
echo =========================================
echo.
echo Lokasi file:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause