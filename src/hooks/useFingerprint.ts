/**
 * useFingerprint — React wrapper around `fingerprintService`.
 *
 * Exposes a connection state machine (Disconnected | Connecting |
 * Connected | Error) plus high-level operations. NO simulation logic
 * lives here — every call goes through the Electron IPC bridge.
 */

import { useCallback, useEffect, useState } from "react";
import {
  connectDevice,
  disconnectDevice,
  enrollFingerprint,
  verifyFingerprint,
  fetchAttendanceLogs,
  loadDeviceSettings,
  isBridgeAvailable,
  FingerprintError,
  type DeviceSettings,
} from "@/services/fingerprintService";
import type { AttendanceLog } from "@/types/electron";

export type DeviceStatus = "disconnected" | "connecting" | "connected" | "error";

export function useFingerprint() {
  const [status, setStatus] = useState<DeviceStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DeviceSettings>(() => loadDeviceSettings());
  const bridgeReady = isBridgeAvailable();

  const connect = useCallback(
    async (override?: Partial<DeviceSettings>) => {
      setStatus("connecting");
      setError(null);
      try {
        await connectDevice(override);
        setStatus("connected");
        if (override) setSettings((s) => ({ ...s, ...override }));
      } catch (e) {
        const msg = e instanceof FingerprintError ? e.message : "Unknown error";
        setError(msg);
        setStatus("error");
        throw e;
      }
    },
    [],
  );

  const disconnect = useCallback(async () => {
    try {
      await disconnectDevice();
    } finally {
      setStatus("disconnected");
    }
  }, []);

  const enroll = useCallback(async (memberId: string): Promise<string> => {
    if (status !== "connected") {
      throw new FingerprintError("Device not connected", "NOT_CONNECTED");
    }
    return enrollFingerprint(memberId);
  }, [status]);

  const verify = useCallback(async (): Promise<string | null> => {
    if (status !== "connected") {
      throw new FingerprintError("Device not connected", "NOT_CONNECTED");
    }
    return verifyFingerprint();
  }, [status]);

  const fetchLogs = useCallback(async (): Promise<AttendanceLog[]> => {
    if (status !== "connected") {
      throw new FingerprintError("Device not connected", "NOT_CONNECTED");
    }
    return fetchAttendanceLogs();
  }, [status]);

  // Reload settings if changed elsewhere (e.g. settings page)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "f2f.deviceSettings") setSettings(loadDeviceSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    status,
    error,
    settings,
    bridgeReady,
    isConnected: status === "connected",
    connect,
    disconnect,
    enroll,
    verify,
    fetchLogs,
  };
}
