import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Info } from "lucide-react";

export type StatusType = "success" | "error" | "warning" | "waiting" | "info";

interface StatusDisplayProps {
  message: string;
  type: StatusType;
}

const config: Record<StatusType, { icon: typeof CheckCircle; className: string }> = {
  success: { icon: CheckCircle, className: "border-success/40 bg-success/10 text-success" },
  error: { icon: XCircle, className: "border-destructive/40 bg-destructive/10 text-destructive" },
  warning: { icon: AlertTriangle, className: "border-warning/40 bg-warning/10 text-warning" },
  waiting: { icon: Loader2, className: "border-primary/40 bg-primary/10 text-primary" },
  info: { icon: Info, className: "border-muted-foreground/40 bg-muted/30 text-muted-foreground" },
};

export function StatusDisplay({ message, type }: StatusDisplayProps) {
  const { icon: Icon, className } = config[type];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${className}`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${type === "waiting" ? "animate-spin" : ""}`} />
        <span className="text-sm font-medium">{message}</span>
      </motion.div>
    </AnimatePresence>
  );
}
