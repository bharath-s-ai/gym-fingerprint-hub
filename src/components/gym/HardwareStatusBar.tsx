import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Loader2, AlertTriangle, Settings as SettingsIcon, RefreshCw } from "lucide-react";
import type { DeviceStatus } from "@/hooks/useFingerprint";

interface HardwareStatusBarProps {
  status: DeviceStatus;
  deviceIp?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

const STATUS_META: Record<DeviceStatus, { label: string; tone: "success" | "warning" | "destructive" | "muted" }> = {
  connected: { label: "Connected", tone: "success" },
  connecting: { label: "Connecting…", tone: "warning" },
  error: { label: "Error", tone: "destructive" },
  disconnected: { label: "Disconnected", tone: "muted" },
};

export function HardwareStatusBar({
  status,
  deviceIp,
  errorMessage,
  onRetry,
  onOpenSettings,
}: HardwareStatusBarProps) {
  const meta = STATUS_META[status];
  const showAlert = status === "error" || status === "disconnected";

  const toneClasses =
    meta.tone === "success"
      ? "bg-success/10 border-success/20 text-success"
      : meta.tone === "warning"
        ? "bg-warning/10 border-warning/20 text-warning"
        : meta.tone === "destructive"
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : "bg-muted/30 border-border text-muted-foreground";

  return (
    <div className="relative">
      <div
        className={`w-full min-h-8 flex items-center justify-between px-2 sm:px-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 flex-wrap gap-y-0.5 border-b ${toneClasses}`}
      >
        <div className="flex items-center gap-2">
          {status === "connected" ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : status === "connecting" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <WifiOff className="w-3.5 h-3.5" />
            </motion.div>
          )}
          <span>eSSL Device — {meta.label}</span>
        </div>

        <div className="flex items-center gap-2">
          {deviceIp && <span className="text-muted-foreground font-mono normal-case">{deviceIp}</span>}
          {(status === "error" || status === "disconnected") && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors text-[10px] font-black uppercase tracking-wider"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/40 text-muted-foreground border border-border hover:bg-muted/60 transition-colors text-[10px] font-black uppercase tracking-wider"
            >
              <SettingsIcon className="w-3 h-3" /> Settings
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAlert && errorMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 py-1.5 text-[11px] font-black uppercase tracking-widest bg-destructive/20 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="normal-case">{errorMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
