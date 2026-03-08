import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Info } from "lucide-react";

export type StatusType = "success" | "error" | "warning" | "waiting" | "info";

interface StatusDisplayProps {
  message: string;
  type: StatusType;
}

const config: Record<StatusType, { icon: typeof CheckCircle; className: string; glow: string }> = {
  success: {
    icon: CheckCircle,
    className: "border-success/40 bg-success/10 text-success",
    glow: "shadow-[0_0_20px_hsl(142_71%_45%/0.15)]",
  },
  error: {
    icon: XCircle,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    glow: "shadow-[0_0_20px_hsl(0_84%_60%/0.15)]",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning/40 bg-warning/10 text-warning",
    glow: "shadow-[0_0_20px_hsl(45_93%_47%/0.15)]",
  },
  waiting: {
    icon: Loader2,
    className: "border-primary/40 bg-primary/10 text-primary",
    glow: "shadow-[0_0_20px_hsl(25_95%_53%/0.15)]",
  },
  info: {
    icon: Info,
    className: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
    glow: "",
  },
};

export function StatusDisplay({ message, type }: StatusDisplayProps) {
  const { icon: Icon, className, glow } = config[type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 ${className} ${glow}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${type === "waiting" ? "animate-spin" : ""}`} />
        <span className="text-sm font-black uppercase tracking-wider leading-tight">{message}</span>
      </motion.div>
    </AnimatePresence>
  );
}
