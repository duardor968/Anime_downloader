# Agent Instructions

## Project Overview

AnimeHub is a Node.js/Express anime downloader UI that scrapes AnimeAV1 data and sends links to JDownloader. It uses CommonJS, EJS views, Tailwind CSS 4, and Node.js SEA builds for standalone Windows and Linux binaries.

## Environment

- Use Node.js 20+ for development and SEA builds.
- The app entrypoint is `server.js`.
- Runtime configuration is loaded from `.env` when present.
- Persistent app settings are stored outside the repo:
  - Windows: `%APPDATA%/AnimeHub/settings.json`
  - Linux: `$XDG_CONFIG_HOME/animehub/settings.json` or `~/.config/animehub/settings.json`

## Common Commands

```bash
npm start
npm run dev
npm run build:css
npm run generate:assets
```

For release binaries:

```bash
# Windows
./build-sea.bat

# Linux / WSL
./build-sea.sh
```

The build scripts read the version from `package.json` and write binaries to `release/`.

## WSL Notes

When building the Linux binary from automation, run the script through the user's login shell so PATH managers such as `fnm` are loaded. For this repo, prefer:

```bash
wsl -e zsh -lic 'cd ~/Anime_downloader && ./build-sea.sh'
```

Do not assume `wsl -e sh -lc` sees the same Node.js version as the user's terminal.

## Release Workflow

1. Confirm `package.json` has the intended version.
2. Build Windows with `build-sea.bat`.
3. Build Linux from WSL with `build-sea.sh`.
4. Copy the Linux artifact into the Windows repo `release/` folder if publishing both assets from Windows.
5. Create an annotated tag matching the package version, for example `v1.5.1`.
6. Push the tag.
7. Create a GitHub draft release and upload both assets:
   - `AnimeHub-v<version>-windows.exe`
   - `AnimeHub-v<version>-linux`

## Release Notes Format

Use curated release notes, not a raw commit dump. Follow this structure and omit sections that do not apply:

```markdown
Short one-paragraph summary.

## Highlights

- User-facing change 1
- User-facing change 2

## Added

- New capability or workflow

## Fixed

- Bug fix or reliability improvement

## Changed

- Behavior, configuration, or build change

## Build and Maintenance

- Packaging, CI, or dependency maintenance

## Upgrade Notes

- Required user action, migration, compatibility note, or "No manual migration required"

## Known Issues

- Open issue users should know before upgrading

## Full Changelog

**Full Changelog**: https://github.com/duardor968/Anime_downloader/compare/vPREVIOUS...vCURRENT
```

Do not add an `Assets` section just to repeat files GitHub already lists below the release notes. If checksums are needed, prefer a separate `SHA256SUMS.txt` asset or a dedicated `Checksums` section.

## Git Hygiene

- Do not commit generated build outputs from `dist/`, `release/`, `sea-prep.blob`, or `sea-assets-manifest.json`.
- `package-lock.json` is currently ignored in this repo; do not add it unless intentionally changing that policy.
- Keep changes scoped. Avoid unrelated formatting churn in EJS, CSS, or scraper code.

## Code Style

- Keep CommonJS style (`require`, `module.exports`) unless the project is intentionally migrated.
- Prefer existing helpers in `utils/` before adding new modules.
- Tailwind CSS 4 is configured through `src/input.css`; there is no `tailwind.config.js`.
- Keep server routes and browser scripts simple and explicit. This is a small app, so avoid unnecessary abstractions.

## Verification

Use the smallest relevant check for the change:

- Server/runtime changes: run `npm start` or invoke the touched module directly when practical.
- CSS/UI changes: run `npm run build:css`.
- SEA/release changes: run the platform build script and verify files in `release/`.
- JDownloader changes: verify both local API mode and My.JDownloader assumptions where possible.
