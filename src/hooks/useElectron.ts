/**
 * useElectron — React hook for Electron IPC integration.
 *
 * Gracefully degrades when running in a normal browser
 * (isElectron === false), so all features work in Lovable
 * preview without errors.
 */

import { useState, useEffect, useCallback } from "react";

// ── Type declarations for the contextBridge API ──────────────────────────────
interface ElectronBridge {
  isElectron: true;
  showWindow: () => Promise<void>;
  getAlwaysOnTop: () => Promise<boolean>;
  setAlwaysOnTop: (value: boolean) => Promise<void>;
  onAlwaysOnTopChanged: (cb: (value: boolean) => void) => () => void;
  getAutoStart: () => Promise<boolean>;
  setAutoStart: (value: boolean) => Promise<void>;
  setTrayStatus: (status: "ready" | "scanning") => Promise<void>;
}

declare global {
  interface Window {
    electron?: ElectronBridge;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useElectron() {
  const isElectron = typeof window !== "undefined" && !!window.electron?.isElectron;
  const api = isElectron ? window.electron! : null;

  const [alwaysOnTop, setAlwaysOnTopState] = useState(false);
  const [autoStart, setAutoStartState] = useState(false);

  // Load initial values from Electron
  useEffect(() => {
    if (!api) return;
    api.getAlwaysOnTop().then(setAlwaysOnTopState);
    api.getAutoStart().then(setAutoStartState);
  }, [api]);

  // Keep in sync when user changes always-on-top via tray menu
  useEffect(() => {
    if (!api) return;
    const cleanup = api.onAlwaysOnTopChanged((value) => {
      setAlwaysOnTopState(value);
    });
    return cleanup;
  }, [api]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleAlwaysOnTop = useCallback(async () => {
    if (!api) return;
    const next = !alwaysOnTop;
    await api.setAlwaysOnTop(next);
    setAlwaysOnTopState(next);
  }, [api, alwaysOnTop]);

  const toggleAutoStart = useCallback(async () => {
    if (!api) return;
    const next = !autoStart;
    await api.setAutoStart(next);
    setAutoStartState(next);
  }, [api, autoStart]);

  const setTrayStatus = useCallback(
    async (status: "ready" | "scanning") => {
      if (!api) return;
      await api.setTrayStatus(status);
    },
    [api]
  );

  return {
    /** true when running inside Electron, false in browser */
    isElectron,
    /** Current always-on-top window state */
    alwaysOnTop,
    /** Toggle always-on-top (no-op in browser) */
    toggleAlwaysOnTop,
    /** Current auto-start with system state */
    autoStart,
    /** Toggle auto-start with system (no-op in browser) */
    toggleAutoStart,
    /** Update tray icon: "ready" (green) | "scanning" (orange) */
    setTrayStatus,
  };
}
