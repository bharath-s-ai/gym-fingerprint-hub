import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, Activity, AlertTriangle } from "lucide-react";

const LATENCY_THRESHOLD = 80;
const HISTORY_MAX = 12; // 12 samples × 5s = 60 seconds

interface HardwareStatusBarProps {
  isHardware: boolean;
  isConnected: boolean;
  deviceIp?: string;
  latencyMs?: number | null;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  onHighLatency?: () => void;
  onDisconnect?: () => void;
  onManualReconnect?: () => void;
}

function getLatencyColor(ms: number): string {
  if (ms < 30) return "text-success";
  if (ms < LATENCY_THRESHOLD) return "text-warning";
  return "text-destructive";
}

function getLatencyStroke(ms: number): string {
  if (ms < 30) return "hsl(var(--success))";
  if (ms < LATENCY_THRESHOLD) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

/** Tiny inline SVG sparkline */
function Sparkline({ data, width = 64, height = 18 }: { data: number[]; width?: number; height?: number }) {
  const path = useMemo(() => {
    if (data.length < 2) return "";
    const max = Math.max(...data, 1);
    const stepX = width / (HISTORY_MAX - 1);
    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = height - (v / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M${points.join("L")}`;
  }, [data, width, height]);

  const lastVal = data[data.length - 1] ?? 0;

  if (data.length < 2) return null;

  return (
    <svg width={width} height={height} className="inline-block" style={{ verticalAlign: "middle" }}>
      <path
        d={path}
        fill="none"
        stroke={getLatencyStroke(lastVal)}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      {/* Threshold line */}
      <line
        x1={0}
        y1={height - (LATENCY_THRESHOLD / Math.max(...data, 1)) * (height - 2) - 1}
        x2={width}
        y2={height - (LATENCY_THRESHOLD / Math.max(...data, 1)) * (height - 2) - 1}
        stroke="hsl(var(--destructive))"
        strokeWidth={0.5}
        strokeDasharray="2,2"
        opacity={0.4}
      />
    </svg>
  );
}

export function HardwareStatusBar({
  isHardware,
  isConnected,
  deviceIp,
  latencyMs,
  reconnectAttempt = 0,
  maxReconnectAttempts = 10,
  onHighLatency,
  onDisconnect,
  onManualReconnect,
}: HardwareStatusBarProps) {
  const wasConnected = useRef(isConnected);
  const wasHighLatency = useRef(false);
  const [history, setHistory] = useState<number[]>([]);

  // Accumulate latency history
  useEffect(() => {
    if (latencyMs != null) {
      setHistory((prev) => {
        const next = [...prev, latencyMs];
        return next.length > HISTORY_MAX ? next.slice(-HISTORY_MAX) : next;
      });
    }
  }, [latencyMs]);

  // Clear history on disconnect
  useEffect(() => {
    if (!isConnected) setHistory([]);
  }, [isConnected]);

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
        className={`w-full min-h-8 flex items-center justify-between px-2 sm:px-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 flex-wrap gap-y-0.5 ${
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
          {!isConnected && reconnectAttempt > 0 && reconnectAttempt < maxReconnectAttempts && (
            <>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-destructive"
              >
                RECONNECTING...
              </motion.span>
              <span className="text-destructive/60 text-[10px]">
                Attempt {reconnectAttempt}/{maxReconnectAttempts}
              </span>
            </>
          )}
          {!isConnected && reconnectAttempt >= maxReconnectAttempts && (
            <>
              <span className="text-destructive text-[10px] font-black">FAILED</span>
              {onManualReconnect && (
                <button
                  onClick={onManualReconnect}
                  className="ml-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
                >
                  Retry
                </button>
              )}
            </>
          )}
          {!isConnected && reconnectAttempt === 0 && (
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
          {/* Sparkline */}
          {isConnected && history.length >= 2 && (
            <Sparkline data={history} />
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
