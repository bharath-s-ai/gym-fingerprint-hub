/**
 * Electron preload typings.
 *
 * The renderer talks to the eSSL / ZKTeco SDK exclusively through these
 * `window.fingerprint.*` IPC bindings. The Electron preload script must
 * expose this exact shape via contextBridge.
 */

export interface AttendanceLog {
  /** Member identifier registered on the device (string for portability) */
  userId: string;
  /** ISO 8601 timestamp of the punch */
  timestamp: string;
  /** Optional verification mode (1 = fingerprint, etc.) */
  verifyMode?: number;
}

export interface FingerprintBridge {
  /** Open a connection to the configured device. */
  connect(opts?: { ip?: string; port?: number }): Promise<void>;
  /** Close the active connection. */
  disconnect(): Promise<void>;
  /** Capture and store a template against the given member id. */
  enroll(memberId: string): Promise<string>;
  /** Capture a finger and return the matched member id (or null). */
  verify(): Promise<string | null>;
  /** Pull all attendance punches stored on the device. */
  fetchLogs(): Promise<AttendanceLog[]>;
}

declare global {
  interface Window {
    fingerprint?: FingerprintBridge;
    /** Legacy Electron desktop bridge (window/tray helpers). */
    electron?: {
      isElectron: true;
      showWindow?: () => Promise<void>;
      getAlwaysOnTop?: () => Promise<boolean>;
      setAlwaysOnTop?: (v: boolean) => Promise<void>;
      onAlwaysOnTopChanged?: (cb: (v: boolean) => void) => () => void;
      getAutoStart?: () => Promise<boolean>;
      setAutoStart?: (v: boolean) => Promise<void>;
      setTrayStatus?: (status: "ready" | "scanning") => Promise<void>;
    };
  }
}

export {};
