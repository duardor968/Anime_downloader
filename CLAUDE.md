# Claude Instructions

Follow the repository guidance in `AGENTS.md`.

Important local note: for Linux release builds, simulate the user's WSL terminal by using `zsh -lic`, not plain `sh -lc`, so the configured Node.js version from the user's shell is available:

```bash
wsl -e zsh -lic 'cd ~/Anime_downloader && ./build-sea.sh'
```

Before publishing a release, confirm the generated Windows and Linux binaries are both present in `release/` and named for the version in `package.json`.
