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

echo [1/7] Cleaning output folders...
if exist dist rmdir /S /Q dist
if exist release rmdir /S /Q release
if exist sea-prep.blob del /f /q sea-prep.blob
mkdir release

echo [2/7] Generating asset manifest...
call npm run --silent generate:assets

echo [3/7] Bundling with ncc...
call npx --yes @vercel/ncc build server.js -o dist --quiet

echo [4/7] Generating SEA blob...
node scripts/build-sea-config.js
node --experimental-sea-config sea-config.generated.json

echo [5/7] Locating node.exe...
if not defined NODE_EXE for /f "usebackq tokens=*" %%p in (`node -p "process.execPath"`) do set "NODE_EXE=%%p"
if not exist "%NODE_EXE%" (
  echo node.exe no encontrado. Define NODE_EXE o instala Node.js.
  exit /b 1
)
copy /Y "%NODE_EXE%" "release\\AnimeHub-v%APP_VERSION%-windows.exe" >nul

echo [6/7] Injecting SEA blob into executable...
call npx --yes postject "release\\AnimeHub-v%APP_VERSION%-windows.exe" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite

if exist "public\\images\\favicon.ico" (
  echo [6b/7] Embedding icon and metadata...
  call npx --yes resedit-cli --ignore-signed ^
    --in "release\\AnimeHub-v%APP_VERSION%-windows.exe" ^
    --out "release\\AnimeHub-v%APP_VERSION%-windows.exe" ^
    --icon 1,"public\\images\\favicon.ico" ^
    --file-version "%APP_VERSION%.0" ^
    --product-version "%APP_VERSION%.0" ^
    --product-name "AnimeHub" ^
    --file-description "Anime downloader"
  if errorlevel 1 (
    echo [WARN] resedit-cli falló al inyectar icono/metadata.
  )
)

echo [7/7] Cleaning temporary files...
if exist sea-prep.blob del /f /q sea-prep.blob
if exist sea-config.generated.json del /f /q sea-config.generated.json

echo Done. Executable: release\\AnimeHub-v%APP_VERSION%-windows.exe
popd
endlocal
