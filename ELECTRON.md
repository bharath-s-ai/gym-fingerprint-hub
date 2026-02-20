# Electron Scripts Setup

Because Lovable manages `package.json` automatically, add these scripts
manually after cloning/exporting the project locally:

```json
{
  "scripts": {
    "electron:dev":     "concurrently \"vite\" \"wait-on http://localhost:8080 && electron .\"",
    "electron:preview": "vite build && electron .",
    "electron:build":   "vite build && electron-builder"
  }
}
```

You'll also need `wait-on` as a dev dependency:
```
npm install --save-dev wait-on
```

## Running locally

| Command | What it does |
|---|---|
| `npm run electron:dev` | Starts Vite dev server + Electron in parallel |
| `npm run electron:preview` | Builds Vite, then opens Electron from dist/ |
| `npm run electron:build` | Packages into a distributable (NSIS installer on Windows, DMG on macOS) |

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Show / hide window globally |
| `E` | Switch to Enrollment mode |
| `C` | Switch to Check-in mode |
| `D` | Go to Dashboard |
| `Esc` | Go back to home |

## System tray

- **Green dot** = system ready for check-in  
- **Orange dot** = fingerprint scan in progress  
- Double-click tray icon to restore window  
- Right-click tray → context menu with Always on Top, Auto-start, Quit

## Build assets

Place your app icons in `electron/assets/`:
- `icon.icns` — macOS
- `icon.ico` — Windows  
- `icon.png` — Linux (512×512 recommended)
