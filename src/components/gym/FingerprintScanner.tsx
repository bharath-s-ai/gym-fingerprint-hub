import { motion } from "framer-motion";
import { Fingerprint, UserPlus } from "lucide-react";

interface FingerprintScannerProps {
  isScanning: boolean;
  mode: "enrollment" | "checkin";
  status?: "idle" | "success" | "error";
}

export function FingerprintScanner({ isScanning, mode, status = "idle" }: FingerprintScannerProps) {
  const ringColor = status === "success"
    ? "border-success"
    : status === "error"
    ? "border-destructive"
    : "border-primary/30";

  const iconColor = status === "success"
    ? "text-success"
    : status === "error"
    ? "text-destructive"
    : "text-primary";

  return (
    <div className="relative w-52 h-52 mx-auto">
      {/* Outer ring 1 */}
      <motion.div
        animate={isScanning ? { scale: [1, 1.08, 1], opacity: [0.3, 0.7, 0.3] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 rounded-lg border-2 ${ringColor} transition-colors duration-300`}
      />

      {/* Outer ring 2 */}
      <motion.div
        animate={isScanning ? { scale: [1, 1.06, 1], opacity: [0.2, 0.5, 0.2] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        className={`absolute inset-3 rounded-lg border-2 ${ringColor} transition-colors duration-300`}
      />

      {/* Outer ring 3 */}
      <motion.div
        animate={isScanning ? { scale: [1, 1.04, 1], opacity: [0.15, 0.4, 0.15] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        className={`absolute inset-6 rounded-lg border-2 ${ringColor} transition-colors duration-300`}
      />

      {/* Inner surface */}
      <div className="absolute inset-9 rounded-lg bg-[#0A0A0A] flex items-center justify-center shadow-inner border border-primary/10">
        <motion.div
          animate={isScanning ? { scale: [1, 1.1, 1] } : status === "error" ? {} : {}}
          transition={{ duration: 1.5, repeat: isScanning ? Infinity : 0 }}
          className={status === "error" ? "animate-shake" : ""}
        >
          {mode === "enrollment" ? (
            <UserPlus className={`w-14 h-14 ${iconColor} transition-colors duration-300`} />
          ) : (
            <Fingerprint className={`w-14 h-14 ${iconColor} transition-colors duration-300`} />
          )}
        </motion.div>
      </div>

      {/* Scan line */}
      {isScanning && (
        <motion.div
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ boxShadow: "0 0 12px hsl(25 95% 53% / 0.6)" }}
        />
      )}
    </div>
  );
}
