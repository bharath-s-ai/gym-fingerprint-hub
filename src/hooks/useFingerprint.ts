/**
 * useFingerprint — Hardware fingerprint integration hook.
 *
 * When running in Electron with an eSSL K30 Pro connected, uses real
 * hardware via IPC. Falls back to simulation in the browser.
 */

import { useState, useCallback, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface EsslBridge {
  connect: (opts?: { ip?: string; port?: number }) => Promise<{ success: boolean; error?: string; ip?: string; port?: number }>;
  disconnect: () => Promise<{ success: boolean }>;
  capture: () => Promise<{ success: boolean; template?: string; error?: string }>;
  enroll: (opts: { userId: string }) => Promise<{ success: boolean; template?: string; error?: string; samples?: number }>;
  match: () => Promise<{ success: boolean; matched?: boolean; userId?: string | null; error?: string }>;
  delete: (opts: { userId: string }) => Promise<{ success: boolean; error?: string }>;
  sync: () => Promise<{ success: boolean; logs?: any[]; count?: number; error?: string }>;
  info: () => Promise<{ success: boolean; model?: string; error?: string }>;
  autoDetect: (opts?: { subnet?: string }) => Promise<{ success: boolean; found?: boolean; ip?: string | null; port?: number | null }>;
  status: () => Promise<{ success: boolean; connected: boolean; ip?: string | null }>;
  onScanning: (cb: (v: boolean) => void) => () => void;
  onEnrollProgress: (cb: (v: { sample: number; total: number }) => void) => () => void;
  onStatus: (cb: (v: string) => void) => () => void;
}

declare global {
  interface Window {
    electron?: {
      isElectron: true;
      essl?: EsslBridge;
      [key: string]: any;
    };
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useFingerprint() {
  const essl = typeof window !== "undefined" ? window.electron?.essl : null;
  const isHardware = !!essl;

  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Listen for hardware events
  useEffect(() => {
    if (!essl) return;
    const cleanupScanning = essl.onScanning(setIsScanning);
    const cleanupStatus = essl.onStatus((status) => {
      setIsConnected(status === "connected");
    });
    // Check initial status
    essl.status().then((res) => {
      if (res.success) setIsConnected(res.connected);
    });
    return () => {
      cleanupScanning();
      cleanupStatus();
    };
  }, [essl]);

  // Periodic latency ping (every 5s when connected)
  useEffect(() => {
    if (!isConnected) {
      setLatencyMs(null);
      return;
    }

    const ping = async () => {
      const start = performance.now();
      try {
        if (essl) {
          await essl.status();
        } else {
          // Simulation: fake 5-25ms latency
          await new Promise((r) => setTimeout(r, 5 + Math.random() * 20));
        }
        setLatencyMs(Math.round(performance.now() - start));
      } catch {
        setLatencyMs(null);
      }
    };

    ping(); // immediate first ping
    const interval = setInterval(ping, 5000);
    return () => clearInterval(interval);
  }, [essl, isConnected]);

  // ── Connect (hardware or simulated init) ──────────────────────────────
  const connect = useCallback(async (ip?: string, port?: number) => {
    setDeviceError(null);
    if (essl) {
      const result = await essl.connect({ ip, port });
      if (!result.success) {
        setDeviceError(result.error || "Connection failed");
        throw new Error(result.error || "Failed to connect to eSSL K30 Pro");
      }
      setIsConnected(true);
      setIsInitialized(true);
      return result;
    }
    // Simulation fallback
    await new Promise((r) => setTimeout(r, 1000));
    setIsConnected(true);
    setIsInitialized(true);
    return { success: true };
  }, [essl]);

  // ── Initialize (alias for connect with defaults) ──────────────────────
  const initialize = useCallback(async () => {
    return connect();
  }, [connect]);

  // ── Capture single fingerprint ────────────────────────────────────────
  const capture = useCallback(async () => {
    if (essl) {
      if (!isConnected) throw new Error("Device not connected");
      const result = await essl.capture();
      if (!result.success) throw new Error(result.error || "Capture failed");
      return result.template!;
    }
    // Simulation
    if (!isInitialized) throw new Error("Scanner not initialized");
    await new Promise((r) => setTimeout(r, 2000));
    return `TEMPLATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [essl, isConnected, isInitialized]);

  // ── Enroll (3 samples, hardware does quality check) ───────────────────
  const enroll = useCallback(async (userId: string) => {
    if (essl) {
      if (!isConnected) throw new Error("Device not connected");
      const result = await essl.enroll({ userId });
      if (!result.success) throw new Error(result.error || "Enrollment failed");
      return result.template!;
    }
    // Simulation — 3 captures
    if (!isInitialized) throw new Error("Scanner not initialized");
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 1500));
    }
    return `TEMPLATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [essl, isConnected, isInitialized]);

  // ── Match fingerprint ─────────────────────────────────────────────────
  const match = useCallback(async (template1?: string, template2?: string) => {
    if (essl) {
      if (!isConnected) throw new Error("Device not connected");
      const result = await essl.match();
      if (!result.success) return false;
      return result.matched || false;
    }
    // Simulation
    if (template1 && template2) {
      await new Promise((r) => setTimeout(r, 500));
      return template1.split("_")[1] === template2.split("_")[1];
    }
    return false;
  }, [essl, isConnected]);

  // ── Delete fingerprint ────────────────────────────────────────────────
  const deleteTemplate = useCallback(async (userId: string) => {
    if (essl) {
      if (!isConnected) throw new Error("Device not connected");
      const result = await essl.delete({ userId });
      if (!result.success) throw new Error(result.error || "Delete failed");
      return true;
    }
    return true;
  }, [essl, isConnected]);

  // ── Sync logs from device ─────────────────────────────────────────────
  const syncLogs = useCallback(async () => {
    if (essl) {
      if (!isConnected) throw new Error("Device not connected");
      const result = await essl.sync();
      if (!result.success) throw new Error(result.error || "Sync failed");
      return result.logs || [];
    }
    return [];
  }, [essl, isConnected]);

  // ── Auto-detect device ────────────────────────────────────────────────
  const autoDetect = useCallback(async (subnet?: string) => {
    if (essl) {
      const result = await essl.autoDetect({ subnet });
      return result;
    }
    return { success: false, found: false, ip: null, port: null };
  }, [essl]);

  return {
    // Connection
    initialize,
    connect,
    isConnected,
    isInitialized,
    isHardware,
    deviceError,
    latencyMs,
    // Fingerprint operations
    capture,
    enroll,
    match,
    deleteTemplate,
    // Device management
    syncLogs,
    autoDetect,
    // Scanning state
    isScanning,
  };
}
