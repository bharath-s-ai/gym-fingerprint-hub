import { motion } from "framer-motion";
import { Fingerprint, UserPlus } from "lucide-react";

interface FingerprintScannerProps {
  isScanning: boolean;
  mode: "enrollment" | "checkin";
}

export function FingerprintScanner({ isScanning, mode }: FingerprintScannerProps) {
  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Outer ring */}
      <motion.div
        animate={isScanning ? { scale: [1, 1.1, 1], opacity: [0.3, 0.7, 0.3] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full border-4 border-primary/30"
      />

      {/* Middle dashed ring */}
      <motion.div
        animate={isScanning ? { rotate: 360 } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 rounded-full border-2 border-dashed border-secondary/40"
      />

      {/* Inner circle */}
      <div className="absolute inset-8 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center shadow-inner">
        <motion.div
          animate={isScanning ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {mode === "enrollment" ? (
            <UserPlus className="w-14 h-14 text-primary" />
          ) : (
            <Fingerprint className="w-14 h-14 text-primary" />
          )}
        </motion.div>
      </div>

      {/* Scan line */}
      {isScanning && (
        <motion.div
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-success to-transparent"
          style={{ boxShadow: "0 0 12px hsl(var(--success) / 0.8)" }}
        />
      )}
    </div>
  );
}
