/**
 * F2F Fitness — Electron Main Process
 *
 * Features:
 *  - Single instance lock (prevents duplicate windows)
 *  - System tray with context menu (minimize-to-tray on close)
 *  - Global hotkey Ctrl+Shift+F / Cmd+Shift+F to show/hide
 *  - Always-on-top toggle (via IPC + tray menu)
 *  - Auto-start with Windows/macOS login (via IPC + tray menu)
 *  - Tray icon color: green = ready, orange = scanning
 *  - IPC bridge for React renderer communication
 *
 * ─── Dev scripts to add to package.json ──────────────────────────────────────
 *   "electron:dev":   "concurrently \"vite\" \"wait-on http://localhost:8080 && electron .\"",
 *   "electron:build": "vite build && electron-builder",
 *   "electron:preview": "vite build && electron ."
 * ─────────────────────────────────────────────────────────────────────────────
 */

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  ipcMain,
  nativeImage,
  shell,
} = require("electron");
const path = require("path");

// ── Single instance lock ────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── State ───────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isAlwaysOnTop = false;
let currentTrayStatus = "ready"; // "ready" | "scanning"
const isDev = !app.isPackaged;

// ── Tray icon generator (SVG → nativeImage, cross-platform) ────────────────
function makeTrayIcon(status) {
  const color = status === "scanning" ? "#f97316" : "#22c55e";
  const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6.5" fill="${color}" />
    <circle cx="8" cy="8" r="4" fill="white" opacity="0.3"/>
  </svg>`;
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
  );
}

// ── Tray context menu (rebuilt on state changes) ────────────────────────────
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    {
      label: "Show F2F Fitness",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Always on Top",
      type: "checkbox",
      checked: isAlwaysOnTop,
      click: (item) => {
        isAlwaysOnTop = item.checked;
        if (mainWindow) mainWindow.setAlwaysOnTop(isAlwaysOnTop);
        // Notify renderer of state change
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send("always-on-top-changed", isAlwaysOnTop);
        }
        refreshTrayMenu();
      },
    },
    {
      label: "Start with System",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked });
        refreshTrayMenu();
      },
    },
    { type: "separator" },
    {
      label: "Status: " + (currentTrayStatus === "scanning" ? "🟠 Scanning" : "🟢 Ready"),
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Quit F2F Fitness",
      accelerator: "CmdOrCtrl+Q",
      click: () => {
        app.isQuitting = true;
        if (mainWindow) mainWindow.destroy();
        app.quit();
      },
    },
  ]);
}

function refreshTrayMenu() {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

// ── Create main window ──────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 480,
    minHeight: 600,
    title: "F2F Fitness — Attendance System",
    backgroundColor: "#0a0a0a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load Vite dev server or built files
  if (isDev) {
    mainWindow.loadURL("http://localhost:8080");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Minimize to tray on close (don't quit)
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (tray) {
        tray.displayBalloon &&
          tray.displayBalloon({
            title: "F2F Fitness",
            content: "App minimized to tray. Double-click the icon to restore.",
            iconType: "info",
          });
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── Create system tray ──────────────────────────────────────────────────────
function createTray() {
  tray = new Tray(makeTrayIcon("ready"));
  tray.setToolTip("F2F Fitness — Ready");
  refreshTrayMenu();

  // Double-click to show window
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Single-click on Windows shows window too
  tray.on("click", () => {
    if (process.platform === "win32" && mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// ── IPC Handlers ────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  // Always on top
  ipcMain.handle("get-always-on-top", () => isAlwaysOnTop);
  ipcMain.handle("set-always-on-top", (_, value) => {
    isAlwaysOnTop = value;
    if (mainWindow) mainWindow.setAlwaysOnTop(value);
    refreshTrayMenu();
  });

  // Auto-start with system
  ipcMain.handle("get-auto-start", () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle("set-auto-start", (_, value) => {
    app.setLoginItemSettings({ openAtLogin: value });
    refreshTrayMenu();
  });

  // Tray status indicator (green = ready, orange = scanning)
  ipcMain.handle("set-tray-status", (_, status) => {
    currentTrayStatus = status;
    if (tray) {
      tray.setImage(makeTrayIcon(status));
      tray.setToolTip(
        `F2F Fitness — ${status === "scanning" ? "Scanning fingerprint..." : "Ready"}`
      );
      refreshTrayMenu();
    }
  });

  // Show window from renderer
  ipcMain.handle("show-window", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerIpcHandlers();

  // Global hotkey: Ctrl+Shift+F (Win/Linux) / Cmd+Shift+F (macOS) → show/hide
  globalShortcut.register("CommandOrControl+Shift+F", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

// Second instance → focus existing window
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Unregister shortcuts on quit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Prevent default quit — tray keeps app alive
app.on("window-all-closed", () => {
  // Do NOT call app.quit() — tray keeps app alive
});

// macOS: re-create window when dock icon is clicked
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else if (mainWindow) mainWindow.show();
});
