/**
 * F2F Fitness — eSSL K30 Pro IPC Handlers
 *
 * Registers all essl:* IPC handlers that bridge the
 * Electron main process ZKDevice to the React renderer.
 */

const { ipcMain } = require("electron");
const { ZKDevice } = require("./zkdevice");

let device = null;
let mainWindowRef = null;

function getDevice() {
  if (!device) {
    device = new ZKDevice();
    // Forward events to renderer
    device.on("scanning", (isScanning) => {
      if (mainWindowRef?.webContents) {
        mainWindowRef.webContents.send("essl:scanning", isScanning);
      }
    });
    device.on("enroll-progress", (progress) => {
      if (mainWindowRef?.webContents) {
        mainWindowRef.webContents.send("essl:enroll-progress", progress);
      }
    });
    device.on("connected", () => {
      if (mainWindowRef?.webContents) {
        mainWindowRef.webContents.send("essl:status", "connected");
      }
    });
    device.on("disconnected", (reason) => {
      if (mainWindowRef?.webContents) {
        mainWindowRef.webContents.send("essl:status", "disconnected");
      }
    });
  }
  return device;
}

function registerEsslIpcHandlers(mainWindow) {
  mainWindowRef = mainWindow;

  // ── essl:connect — Connect to K30 Pro device ─────────────────────────
  ipcMain.handle("essl:connect", async (_, { ip, port } = {}) => {
    try {
      const dev = getDevice();
      const result = await dev.connect(
        ip || "192.168.1.201",
        port || 4370
      );
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:disconnect — Disconnect from device ─────────────────────────
  ipcMain.handle("essl:disconnect", async () => {
    try {
      if (device) await device.disconnect();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:capture — Capture single fingerprint ────────────────────────
  ipcMain.handle("essl:capture", async () => {
    try {
      const dev = getDevice();
      const template = await dev.capture();
      return { success: true, template };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:enroll — Enroll with 3 samples ──────────────────────────────
  ipcMain.handle("essl:enroll", async (_, { userId }) => {
    try {
      const dev = getDevice();
      const result = await dev.enroll(userId);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:match — Match fingerprint and return user ID ────────────────
  ipcMain.handle("essl:match", async () => {
    try {
      const dev = getDevice();
      const result = await dev.match();
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:delete — Remove fingerprint template ───────────────────────
  ipcMain.handle("essl:delete", async (_, { userId }) => {
    try {
      const dev = getDevice();
      const result = await dev.deleteTemplate(userId);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:sync — Sync attendance logs from device ────────────────────
  ipcMain.handle("essl:sync", async () => {
    try {
      const dev = getDevice();
      const logs = await dev.syncLogs();
      return { success: true, logs, count: logs.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:info — Get device info ──────────────────────────────────────
  ipcMain.handle("essl:info", async () => {
    try {
      const dev = getDevice();
      if (!dev.connected) {
        return { success: false, error: "Not connected" };
      }
      const info = await dev.getInfo();
      return { success: true, ...info };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:auto-detect — Find device on network ───────────────────────
  ipcMain.handle("essl:auto-detect", async (_, { subnet } = {}) => {
    try {
      const result = await ZKDevice.autoDetect(subnet || "192.168.1");
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ── essl:status — Get current connection status ─────────────────────
  ipcMain.handle("essl:status", async () => {
    return {
      success: true,
      connected: device?.connected || false,
      ip: device?.ip || null,
      port: device?.port || null,
    };
  });
}

module.exports = { registerEsslIpcHandlers };
