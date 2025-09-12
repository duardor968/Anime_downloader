@echo off
echo ========================================
echo  AnimeHub - Build Script v1.2.0
echo ========================================
echo.

echo [1/5] Creating release directory...
if not exist release mkdir release

echo [2/5] Compiling Windows version...
nexe server.js --target windows-x64-22.19.0 --build --output release/AnimeHub-v1.2.0-windows.exe --resource "./views/**/*" --resource "./public/**/*"

if %ERRORLEVEL% neq 0 (
    echo ERROR: Windows compilation failed!
    pause
    exit /b 1
)

echo [3/5] Compiling Linux version...
nexe server.js --target linux-x64-22.19.0 --build --output release/AnimeHub-v1.2.0-linux --resource "./views/**/*" --resource "./public/**/*"

if %ERRORLEVEL% neq 0 (
    echo ERROR: Linux compilation failed!
    pause
    exit /b 1
)

echo [4/5] Adding Windows metadata...
rcedit release/AnimeHub-v1.2.0-windows.exe --set-version-string "ProductName" "AnimeHub"
rcedit release/AnimeHub-v1.2.0-windows.exe --set-version-string "FileDescription" "Anime Downloader"
rcedit release/AnimeHub-v1.2.0-windows.exe --set-version-string "LegalCopyright" "Copyright (c) 2025 Ernesto Duardo Rodríguez"
rcedit release/AnimeHub-v1.2.0-windows.exe --set-file-version "1.2.0"
rcedit release/AnimeHub-v1.2.0-windows.exe --set-product-version "1.2.0"

echo [5/5] Creating source code archives...
tar -czf release/AnimeHub-v1.2.0-source.tar.gz --exclude=node_modules --exclude=release --exclude=.git --exclude=.vs .
powershell -Command "Compress-Archive -Path . -DestinationPath release/AnimeHub-v1.2.0-source.zip -Force -CompressionLevel Optimal" -Exclude node_modules,release,.git,.vs

echo.
echo Build completed successfully!
echo Windows: release/AnimeHub-v1.2.0-windows.exe
echo Linux:   release/AnimeHub-v1.2.0-linux
echo Source:  release/AnimeHub-v1.2.0-source.tar.gz
echo Source:  release/AnimeHub-v1.2.0-source.zip
echo.
pause