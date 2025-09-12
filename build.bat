@echo off
echo ========================================
echo  AnimeHub - Build Script v1.2.0
echo ========================================
echo.

echo [1/5] Creating release directory...
if not exist release mkdir release

echo [2/5] Compiling Windows version...
echo. | nexe server.js --target windows-x64-22.19.0 --build --output release/AnimeHub-v1.2.0-windows.exe --resource "./views/**/*" --resource "./public/**/*"

echo [3/5] Adding Windows metadata...
timeout /t 2 /nobreak >nul
rcedit release/AnimeHub-v1.2.0-windows.exe --set-version-string "ProductName" "AnimeHub" 2>nul || echo Warning: ProductName metadata failed
timeout /t 1 /nobreak >nul
rcedit release/AnimeHub-v1.2.0-windows.exe --set-version-string "FileDescription" "Anime Downloader" 2>nul || echo Warning: FileDescription metadata failed
timeout /t 1 /nobreak >nul
rcedit release/AnimeHub-v1.2.0-windows.exe --set-version-string "LegalCopyright" "Copyright (c) 2025 Ernesto Duardo Rodríguez" 2>nul || echo Warning: LegalCopyright metadata failed
timeout /t 1 /nobreak >nul
rcedit release/AnimeHub-v1.2.0-windows.exe --set-file-version "1.2.0" 2>nul || echo Warning: FileVersion metadata failed
timeout /t 1 /nobreak >nul
rcedit release/AnimeHub-v1.2.0-windows.exe --set-product-version "1.2.0" 2>nul || echo Warning: ProductVersion metadata failed

echo [4/5] Creating source code archives...
tar -czf release/AnimeHub-v1.2.0-source.tar.gz --exclude=node_modules --exclude=release --exclude=.git --exclude=.vs .
powershell -Command "Get-ChildItem -Path . -Exclude node_modules,release,.git,.vs | Compress-Archive -DestinationPath release/AnimeHub-v1.2.0-source.zip -Force -CompressionLevel Optimal"

echo [5/5] Compiling Linux version...
echo. | nexe server.js --target linux-x64-22.19.0 --build --output release/AnimeHub-v1.2.0-linux --resource "./views/**/*" --resource "./public/**/*"

echo.
echo Build completed successfully!
echo Windows: release/AnimeHub-v1.2.0-windows.exe
echo Linux:   release/AnimeHub-v1.2.0-linux
echo Source:  release/AnimeHub-v1.2.0-source.tar.gz
echo Source:  release/AnimeHub-v1.2.0-source.zip
echo.
pause