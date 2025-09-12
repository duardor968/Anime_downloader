@echo off
echo ========================================
echo  AnimeHub - Build Script v1.2.0
echo ========================================
echo.

echo [1/3] Compiling with NEXE...
nexe server.js --target windows-x64-22.19.0 --build --output release/AnimeHub-v1.2.0.exe --resource "./views/**/*" --resource "./public/**/*"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Compilation failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Adding Windows metadata...
rcedit release/AnimeHub-v1.2.0.exe --set-version-string "ProductName" "AnimeHub"
rcedit release/AnimeHub-v1.2.0.exe --set-version-string "FileDescription" "Anime Downloader"
rcedit release/AnimeHub-v1.2.0.exe --set-version-string "CompanyName" "AnimeHub"
rcedit release/AnimeHub-v1.2.0.exe --set-file-version "1.2.0"
rcedit release/AnimeHub-v1.2.0.exe --set-product-version "1.2.0"

echo.
echo [3/3] Build completed successfully!
echo Output: release/AnimeHub-v1.2.0.exe
echo.
pause