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
    <div className="flex rounded-lg bg-muted/50 p-1 border border-border">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`relative flex-1 py-3 px-4 rounded-md font-bold text-sm uppercase tracking-wider transition-colors duration-200 flex items-center justify-center gap-2 min-h-[48px] ${
            currentMode === mode.id ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {currentMode === mode.id && (
            <motion.div
              layoutId="activeMode"
              className="absolute inset-0 bg-primary rounded-md"
              style={{ boxShadow: "0 0 20px hsl(25 95% 53% / 0.3)" }}
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
