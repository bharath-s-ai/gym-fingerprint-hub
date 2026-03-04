import { motion } from "framer-motion";
import { Wifi, WifiOff, Activity } from "lucide-react";

interface HardwareStatusBarProps {
  isHardware: boolean;
  isConnected: boolean;
  deviceIp?: string;
  latencyMs?: number | null;
}

export function HardwareStatusBar({ isHardware, isConnected, deviceIp, latencyMs }: HardwareStatusBarProps) {
  if (!isHardware) return null;

  return (
    <div
      className={`w-full h-8 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${
        isConnected
          ? "bg-success/10 border-b border-success/20 text-success"
          : "bg-destructive/10 border-b border-destructive/20 text-destructive"
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
          <div className="flex items-center gap-1 text-muted-foreground">
            <Activity className="w-3 h-3" />
            <span>{latencyMs}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}
