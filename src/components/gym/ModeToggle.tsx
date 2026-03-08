import { motion } from "framer-motion";
import { UserPlus, CheckCircle } from "lucide-react";

interface ModeToggleProps {
  currentMode: "enrollment" | "checkin";
  onModeChange: (mode: "enrollment" | "checkin") => void;
}

const modes = [
  { id: "enrollment" as const, label: "ENROLLMENT", icon: UserPlus },
  { id: "checkin" as const, label: "CHECK-IN", icon: CheckCircle },
];

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-xl bg-black/60 p-1 border border-border/60 backdrop-blur-sm">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`relative flex-1 py-3 px-2 sm:px-4 rounded-lg font-black text-[11px] sm:text-sm uppercase tracking-widest transition-colors duration-200 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[52px] ${
            currentMode === mode.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {currentMode === mode.id && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 bg-primary rounded-lg"
              style={{ boxShadow: "0 0 30px hsl(25 95% 53% / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.1)" }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
            />
          )}
          <mode.icon className="relative z-10 w-4 h-4" />
          <span className="relative z-10">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
