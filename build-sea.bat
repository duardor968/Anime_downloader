@echo off
echo ========================================
echo  AnimeHub - SEA Build Script v1.2.2
echo ========================================
echo.

echo [1/7] Creating release directory...
if not exist release mkdir release

echo [2/7] Bundling application with ncc...
echo. | npx @vercel/ncc build server.js -o dist --quiet

echo [3/7] Generating SEA blob...
node --experimental-sea-config sea-config.json

echo [4/7] Copying Node.js executable...
copy /Y "%NODE_HOME%\node.exe" "release\AnimeHub-v1.2.2-windows.exe" >nul
if not exist "release\AnimeHub-v1.2.2-windows.exe" (
    echo Warning: NODE_HOME not set, trying default path...
    copy /Y "C:\Program Files\nodejs\node.exe" "release\AnimeHub-v1.2.2-windows.exe" >nul
)

echo [5/7] Injecting SEA blob into executable...
echo. | npx postject release\AnimeHub-v1.2.2-windows.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite

echo [6/7] Copying resources...
xcopy /E /I /Y views release\views >nul
xcopy /E /I /Y public release\public >nul

echo [7/7] Copying bundled assets...
for /d %%i in (dist\*) do xcopy /E /I /Y "%%i" "release\%%~ni" >nul 2>&1
for %%i in (dist\*) do if not "%%~ni"=="index" xcopy /Y "%%i" "release\" >nul 2>&1

echo.
echo Cleaning up temporary files...
if exist sea-prep.blob del sea-prep.blob >nul 2>&1
if exist dist rmdir /S /Q dist >nul 2>&1

echo.
echo SEA Build completed successfully!
echo Executable: release\AnimeHub-v1.2.2-windows.exe
echo.
pause