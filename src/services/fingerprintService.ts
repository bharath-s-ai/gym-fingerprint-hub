/**
 * fingerprintService — Renderer-side service layer for the eSSL / ZKTeco
 * fingerprint SDK. All hardware calls are routed through Electron IPC
 * via `window.fingerprint.*`.
 *
 * NO SIMULATION. If the bridge is unavailable, every call throws a
 * `FingerprintError` so the UI can surface a clear message.
 */

import type { AttendanceLog } from "@/types/electron";

const SETTINGS_KEY = "f2f.deviceSettings";
const DEFAULT_PORT = 4370;

export interface DeviceSettings {
  ip: string;
  port: number;
}

export class FingerprintError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "FingerprintError";
  }
}

function bridge() {
  const b = typeof window !== "undefined" ? window.fingerprint : undefined;
  if (!b) {
    throw new FingerprintError(
      "Fingerprint device bridge unavailable. Run the desktop app to use the scanner.",
      "NO_BRIDGE",
    );
  }
  return b;
}

// ── Settings persistence (localStorage) ──────────────────────────────────────
export function loadDeviceSettings(): DeviceSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DeviceSettings>;
      if (parsed.ip) {
        return { ip: parsed.ip, port: parsed.port ?? DEFAULT_PORT };
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { ip: "", port: DEFAULT_PORT };
}

export function saveDeviceSettings(settings: DeviceSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Bridge availability ──────────────────────────────────────────────────────
export function isBridgeAvailable(): boolean {
  return typeof window !== "undefined" && !!window.fingerprint;
}

// ── Service operations ──────────────────────────────────────────────────────
export async function connectDevice(opts?: Partial<DeviceSettings>): Promise<void> {
  const settings = { ...loadDeviceSettings(), ...opts };
  if (!settings.ip) {
    throw new FingerprintError("Device IP not configured. Open Settings.", "NO_IP");
  }
  try {
    await bridge().connect({ ip: settings.ip, port: settings.port });
  } catch (e: any) {
    throw new FingerprintError(e?.message ?? "Failed to connect to device", "CONNECT_FAILED");
  }
}

export async function disconnectDevice(): Promise<void> {
  try {
    await bridge().disconnect();
  } catch (e: any) {
    throw new FingerprintError(e?.message ?? "Failed to disconnect", "DISCONNECT_FAILED");
  }
}

export async function enrollFingerprint(memberId: string): Promise<string> {
  try {
    return await bridge().enroll(memberId);
  } catch (e: any) {
    throw new FingerprintError(e?.message ?? "Enrollment failed", "ENROLL_FAILED");
  }
}

export async function verifyFingerprint(): Promise<string | null> {
  try {
    return await bridge().verify();
  } catch (e: any) {
    throw new FingerprintError(e?.message ?? "Verification failed", "VERIFY_FAILED");
  }
}

export async function fetchAttendanceLogs(): Promise<AttendanceLog[]> {
  try {
    return await bridge().fetchLogs();
  } catch (e: any) {
    throw new FingerprintError(e?.message ?? "Failed to fetch logs", "FETCH_LOGS_FAILED");
  }
}
