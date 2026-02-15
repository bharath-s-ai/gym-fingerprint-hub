import { motion } from "framer-motion";
import { UserPlus, CheckCircle } from "lucide-react";

interface ModeToggleProps {
  currentMode: "enrollment" | "checkin";
  onModeChange: (mode: "enrollment" | "checkin") => void;
}

const modes = [
  { id: "enrollment" as const, label: "Enrollment", icon: UserPlus },
  { id: "checkin" as const, label: "Check-in", icon: CheckCircle },
];

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-xl bg-background/50 p-1 border border-border/50">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`relative flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-colors duration-300 flex items-center justify-center gap-2 ${
            currentMode === mode.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {currentMode === mode.id && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 gradient-primary rounded-lg glow-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <mode.icon className="relative z-10 w-4 h-4" />
          <span className="relative z-10">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
