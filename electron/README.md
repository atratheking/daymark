# Desktop shell

The Electron shell loads only `dist/index.html`, uses an isolated sandboxed renderer with Node integration disabled, denies browser permissions, blocks remote network requests and external navigation, and creates no renderer-to-Node bridge. The renderer stores its data in its own local Electron profile.

The native menu emits a `daymark:command` browser event whose `detail` is one of `new-task`, `search`, `today`, `next7`, or `inbox`. It also supplies standard editing, zoom, window, and quit shortcuts. The application identity and profile are **Daymark**.

Build the web renderer before launching Electron. Package with `node scripts/package-desktop.mjs all` (or `mac` / `win`). The packager stages only the built renderer, desktop shell, and a minimal package manifest; research evidence and source-app assets are excluded.

Output goes to `releases/`: a macOS Apple Silicon `.app` and Windows x64 portable directory, plus ZIP archives when packaging on macOS/Linux. Windows archives are manual when the packaging host is Windows. These builds are unsigned and the macOS build is not notarized; they are development builds. A Windows build made on macOS still requires testing on a Windows machine.
