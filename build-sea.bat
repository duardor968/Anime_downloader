@echo off
setlocal enabledelayedexpansion
REM AnimeHub SEA build script (Windows)
REM - Reads version from package.json
REM - Bundles with ncc
REM - Generates SEA blob and injects into node.exe
REM - Embeds icon/metadata via rcedit when available

REM Resolve project root
pushd %~dp0

for /f "usebackq" %%v in (`node -p "require('./package.json').version"`) do set APP_VERSION=%%v
echo === AnimeHub SEA build - version %APP_VERSION% ===

echo [1/8] Cleaning output folders...
if exist dist rmdir /S /Q dist
if exist release rmdir /S /Q release
if exist sea-prep.blob del /f /q sea-prep.blob
mkdir release

echo [2/8] Generating asset manifest...
call npm run --silent generate:assets

echo [3/8] Bundling with ncc...
call npx --yes @vercel/ncc build server.js -o dist --quiet

echo [4/8] Generating SEA blob...
node scripts/build-sea-config.js
node --experimental-sea-config sea-config.generated.json

echo [5/8] Locating node.exe...
if not defined NODE_EXE for /f "usebackq tokens=*" %%p in (`node -p "process.execPath"`) do set "NODE_EXE=%%p"
if not exist "%NODE_EXE%" (
  echo node.exe no encontrado. Define NODE_EXE o instala Node.js.
  exit /b 1
)
copy /Y "%NODE_EXE%" "release\\AnimeHub-v%APP_VERSION%-windows.exe" >nul

echo [6/8] Injecting SEA blob into executable...
call npx --yes postject "release\\AnimeHub-v%APP_VERSION%-windows.exe" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite

if exist "public\\images\\favicon.ico" (
  echo [6b/8] Embedding icon and metadata via JSON definition...
  
  set TEMP_DEF=%CD%\temp-version-definition.json

  (
    echo {
    echo   "lang": 1033,
    echo   "icons": [
    echo     {
    echo       "id": 1,
    echo       "sourceFile": "public\\images\\favicon.ico"
    echo     }
    echo   ],
    echo   "version": {
    echo     "FileVersion": "%APP_VERSION%.0",
    echo     "ProductVersion": "%APP_VERSION%.0",
    echo     "FileDescription": "Anime downloader",
    echo     "ProductName": "AnimeHub",
    echo     "LegalCopyright": "Copyright (c) 2026 Ernesto Duardo Rodriguez",
    echo     "OriginalFilename": "AnimeHub-v%APP_VERSION%-windows.exe",
    echo     "InternalName": "AnimeHub"
    echo   }
    echo }
  ) > "!TEMP_DEF!"

  call npx --yes resedit-cli --ignore-signed ^
    "release\AnimeHub-v%APP_VERSION%-windows.exe" ^
    "release\AnimeHub-v%APP_VERSION%-windows.exe" ^
    --definition "!TEMP_DEF!"

  if errorlevel 1 (
    echo [ERROR] resedit-cli fallo al inyectar recursos desde la definicion.
    if exist "!TEMP_DEF!" del "!TEMP_DEF!"
    exit /b 1
  )

  if exist "!TEMP_DEF!" del "!TEMP_DEF!"

)

echo [7/8] Compressing with UPX...
where upx >nul 2>nul
if %errorlevel%==0 (
  echo [7a/8] Patching PE headers for UPX...
  node scripts\\patch-pe-rsrc.js "release\\AnimeHub-v%APP_VERSION%-windows.exe"
  if errorlevel 1 (
    echo [WARN] PE patch failed. Trying UPX anyway.
  )
  upx -q --no-lzma "release\\AnimeHub-v%APP_VERSION%-windows.exe"
  if errorlevel 1 (
    echo [WARN] UPX compression failed. Continuing without compression.
  ) else (
    echo [INFO] UPX compression completed.
  )
) else (
  echo [INFO] UPX not found. Skipping compression.
)

echo [8/8] Cleaning temporary files...
if exist sea-prep.blob del /f /q sea-prep.blob
if exist sea-config.generated.json del /f /q sea-config.generated.json

echo Done. Executable: release\\AnimeHub-v%APP_VERSION%-windows.exe
popd
endlocal
