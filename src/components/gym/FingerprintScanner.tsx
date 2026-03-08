import { motion } from "framer-motion";
import { Fingerprint, UserPlus } from "lucide-react";

interface FingerprintScannerProps {
  isScanning: boolean;
  mode: "enrollment" | "checkin";
  status?: "idle" | "success" | "error";
}

export function FingerprintScanner({ isScanning, mode, status = "idle" }: FingerprintScannerProps) {
  const isSuccess = status === "success";
  const isError = status === "error";

  const ringColor = isSuccess
    ? "border-success/50"
    : isError
    ? "border-destructive/50"
    : "border-primary/20";

  const glowColor = isSuccess
    ? "shadow-[0_0_40px_hsl(142_71%_45%/0.3)]"
    : isError
    ? "shadow-[0_0_40px_hsl(0_84%_60%/0.3)]"
    : isScanning
    ? "shadow-[0_0_60px_hsl(25_95%_53%/0.25)]"
    : "";

  const iconColor = isSuccess
    ? "text-success"
    : isError
    ? "text-destructive"
    : "text-primary";

  return (
    <div className="relative w-56 h-56 mx-auto">
      {/* Ambient glow backdrop */}
      <div
        className={`absolute -inset-8 rounded-full blur-3xl transition-opacity duration-700 ${
          isScanning ? "opacity-100" : "opacity-0"
        }`}
        style={{ background: "radial-gradient(circle, hsl(25 95% 53% / 0.12) 0%, transparent 70%)" }}
      />

      {/* Outer ring 1 — slowest */}
      <motion.div
        animate={isScanning ? { scale: [1, 1.06, 1], opacity: [0.15, 0.5, 0.15] } : { scale: 1, opacity: 0.3 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 rounded-2xl border ${ringColor} transition-colors duration-500`}
      />

      {/* Outer ring 2 */}
      <motion.div
        animate={isScanning ? { scale: [1, 1.04, 1], opacity: [0.1, 0.4, 0.1] } : { scale: 1, opacity: 0.2 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className={`absolute inset-3 rounded-xl border ${ringColor} transition-colors duration-500`}
      />

      {/* Outer ring 3 */}
      <motion.div
        animate={isScanning ? { scale: [1, 1.03, 1], opacity: [0.08, 0.3, 0.08] } : { scale: 1, opacity: 0.15 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className={`absolute inset-6 rounded-lg border ${ringColor} transition-colors duration-500`}
      />

      {/* Inner surface */}
      <motion.div
        animate={isScanning ? {} : { y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-10 rounded-xl bg-gradient-to-b from-[#0e0e0e] to-[#080808] flex items-center justify-center border border-primary/10 transition-shadow duration-500 ${glowColor}`}
      >
        <motion.div
          animate={
            isScanning
              ? { scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }
              : isError
              ? {}
              : {}
          }
          transition={{ duration: 1.5, repeat: isScanning ? Infinity : 0, ease: "easeInOut" }}
          className={isError ? "animate-shake" : ""}
        >
          {mode === "enrollment" ? (
            <UserPlus className={`w-16 h-16 ${iconColor} transition-colors duration-300 drop-shadow-lg`} />
          ) : (
            <Fingerprint className={`w-16 h-16 ${iconColor} transition-colors duration-300 drop-shadow-lg`} />
          )}
        </motion.div>
      </motion.div>

      {/* Scan line with glow trail */}
      {isScanning && (
        <motion.div
          initial={{ top: "12%" }}
          animate={{ top: "88%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="absolute left-10 right-10 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(25 95% 53% / 0.9) 50%, transparent 100%)",
            boxShadow: "0 0 16px 4px hsl(25 95% 53% / 0.4), 0 0 40px 8px hsl(25 95% 53% / 0.15)",
          }}
        />
      )}

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/30 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/30 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/30 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/30 rounded-br-lg" />
    </div>
  );
}
