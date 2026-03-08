import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Activity, AlertTriangle } from "lucide-react";

const LATENCY_THRESHOLD = 80;

interface HardwareStatusBarProps {
  isHardware: boolean;
  isConnected: boolean;
  deviceIp?: string;
  latencyMs?: number | null;
  onHighLatency?: () => void;
  onDisconnect?: () => void;
}

function getLatencyColor(ms: number): string {
  if (ms < 30) return "text-success";
  if (ms < LATENCY_THRESHOLD) return "text-warning";
  return "text-destructive";
}

export function HardwareStatusBar({
  isHardware,
  isConnected,
  deviceIp,
  latencyMs,
  onHighLatency,
  onDisconnect,
}: HardwareStatusBarProps) {
  const wasConnected = useRef(isConnected);
  const wasHighLatency = useRef(false);

  // Fire disconnect callback when connection drops
  useEffect(() => {
    if (wasConnected.current && !isConnected) {
      onDisconnect?.();
    }
    wasConnected.current = isConnected;
  }, [isConnected, onDisconnect]);

  // Fire high-latency callback when threshold exceeded
  useEffect(() => {
    if (latencyMs != null && latencyMs >= LATENCY_THRESHOLD && !wasHighLatency.current) {
      wasHighLatency.current = true;
      onHighLatency?.();
    } else if (latencyMs != null && latencyMs < LATENCY_THRESHOLD) {
      wasHighLatency.current = false;
    }
  }, [latencyMs, onHighLatency]);

  if (!isHardware) return null;

  const isHighLatency = latencyMs != null && latencyMs >= LATENCY_THRESHOLD;
  const barAlert = !isConnected || isHighLatency;

  return (
    <div className="relative">
      <div
        className={`w-full h-8 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
          !isConnected
            ? "bg-destructive/10 border-b border-destructive/20 text-destructive"
            : isHighLatency
              ? "bg-warning/10 border-b border-warning/20 text-warning"
              : "bg-success/10 border-b border-success/20 text-success"
        }`}
      >
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <WifiOff className="w-3.5 h-3.5" />
            </motion.div>
          )}
          <span>
            eSSL K30 Pro {isConnected ? "Online" : ""}
          </span>
          {!isConnected && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-destructive"
            >
              RECONNECTING...
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isConnected && deviceIp && (
            <span className="text-muted-foreground">{deviceIp}</span>
          )}
          {isConnected && latencyMs != null && (
            <div className={`flex items-center gap-1 ${getLatencyColor(latencyMs)}`}>
              <Activity className="w-3 h-3" />
              <span>{latencyMs}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Flash alert banner for disconnect or high latency */}
      <AnimatePresence>
        {barAlert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <motion.div
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className={`flex items-center justify-center gap-2 py-1.5 text-[11px] font-black uppercase tracking-widest ${
                !isConnected
                  ? "bg-destructive/20 text-destructive"
                  : "bg-warning/20 text-warning"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {!isConnected
                  ? "Device disconnected — check network cable"
                  : `High latency detected (${latencyMs}ms) — performance may be affected`}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
