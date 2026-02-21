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
  showWindow: () => ipcRenderer.invoke("show-window"),

  // ── Always on top ────────────────────────────────────────────────────────
  getAlwaysOnTop: () => ipcRenderer.invoke("get-always-on-top"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("set-always-on-top", value),
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on("always-on-top-changed", (_, value) => callback(value));
    return () => ipcRenderer.removeAllListeners("always-on-top-changed");
  },

  // ── Auto-start ───────────────────────────────────────────────────────────
  getAutoStart: () => ipcRenderer.invoke("get-auto-start"),
  setAutoStart: (value) => ipcRenderer.invoke("set-auto-start", value),

  // ── Tray status indicator ────────────────────────────────────────────────
  setTrayStatus: (status) => ipcRenderer.invoke("set-tray-status", status),

  // ── eSSL K30 Pro Fingerprint Device ──────────────────────────────────────
  essl: {
    connect: (opts) => ipcRenderer.invoke("essl:connect", opts),
    disconnect: () => ipcRenderer.invoke("essl:disconnect"),
    capture: () => ipcRenderer.invoke("essl:capture"),
    enroll: (opts) => ipcRenderer.invoke("essl:enroll", opts),
    match: () => ipcRenderer.invoke("essl:match"),
    delete: (opts) => ipcRenderer.invoke("essl:delete", opts),
    sync: () => ipcRenderer.invoke("essl:sync"),
    info: () => ipcRenderer.invoke("essl:info"),
    autoDetect: (opts) => ipcRenderer.invoke("essl:auto-detect", opts),
    status: () => ipcRenderer.invoke("essl:status"),
    /** Listen for scanning state changes */
    onScanning: (cb) => {
      ipcRenderer.on("essl:scanning", (_, v) => cb(v));
      return () => ipcRenderer.removeAllListeners("essl:scanning");
    },
    /** Listen for enrollment progress */
    onEnrollProgress: (cb) => {
      ipcRenderer.on("essl:enroll-progress", (_, v) => cb(v));
      return () => ipcRenderer.removeAllListeners("essl:enroll-progress");
    },
    /** Listen for connection status changes */
    onStatus: (cb) => {
      ipcRenderer.on("essl:status", (_, v) => cb(v));
      return () => ipcRenderer.removeAllListeners("essl:status");
    },
  },
});
