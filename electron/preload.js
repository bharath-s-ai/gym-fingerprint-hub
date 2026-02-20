/**
 * F2F Fitness — Electron Preload Script
 *
 * Exposes a safe `window.electron` API to the React renderer
 * via contextBridge. All native Electron capabilities go through
 * this bridge — the renderer never has direct Node.js access.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  /** Flag so React can detect it's running inside Electron */
  isElectron: true,

  // ── Window management ────────────────────────────────────────────────────
  /** Show the main window and bring it to focus */
  showWindow: () => ipcRenderer.invoke("show-window"),

  // ── Always on top ────────────────────────────────────────────────────────
  /** Get current always-on-top state */
  getAlwaysOnTop: () => ipcRenderer.invoke("get-always-on-top"),
  /** Set always-on-top state */
  setAlwaysOnTop: (value) => ipcRenderer.invoke("set-always-on-top", value),
  /** Listen for always-on-top changes triggered from the tray menu */
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on("always-on-top-changed", (_, value) => callback(value));
    return () => ipcRenderer.removeAllListeners("always-on-top-changed");
  },

  // ── Auto-start ───────────────────────────────────────────────────────────
  /** Get current auto-start (login item) state */
  getAutoStart: () => ipcRenderer.invoke("get-auto-start"),
  /** Set auto-start with system on login */
  setAutoStart: (value) => ipcRenderer.invoke("set-auto-start", value),

  // ── Tray status indicator ────────────────────────────────────────────────
  /**
   * Update tray icon color:
   *   "ready"    → green dot
   *   "scanning" → orange dot
   */
  setTrayStatus: (status) => ipcRenderer.invoke("set-tray-status", status),
});
