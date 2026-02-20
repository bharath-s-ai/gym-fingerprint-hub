import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, PinIcon, MonitorCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useElectron } from "@/hooks/useElectron";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Fullscreen Toggle ────────────────────────────────────────────────────────
export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="icon"
          className="border-primary/30 bg-muted/50 text-primary hover:bg-primary/10 hover:border-primary/50 min-h-[48px] min-w-[48px]"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Always on Top Toggle (Electron only) ────────────────────────────────────
export function AlwaysOnTopToggle() {
  const { isElectron, alwaysOnTop, toggleAlwaysOnTop } = useElectron();

  // Only render inside Electron
  if (!isElectron) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleAlwaysOnTop}
          variant="outline"
          size="icon"
          className={`border-primary/30 bg-muted/50 min-h-[48px] min-w-[48px] transition-colors ${
            alwaysOnTop
              ? "text-primary border-primary/60 bg-primary/10"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          }`}
          aria-label={alwaysOnTop ? "Disable always on top" : "Enable always on top"}
        >
          <PinIcon className="w-5 h-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {alwaysOnTop ? "Always on Top: ON" : "Always on Top: OFF"}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Auto-Start Toggle (Electron only) ───────────────────────────────────────
export function AutoStartToggle() {
  const { isElectron, autoStart, toggleAutoStart } = useElectron();

  if (!isElectron) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={toggleAutoStart}
          variant="outline"
          size="icon"
          className={`border-primary/30 bg-muted/50 min-h-[48px] min-w-[48px] transition-colors ${
            autoStart
              ? "text-primary border-primary/60 bg-primary/10"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          }`}
          aria-label={autoStart ? "Disable auto-start" : "Enable auto-start with system"}
        >
          <MonitorCheck className="w-5 h-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {autoStart ? "Auto-start: ON" : "Auto-start: OFF"}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Hidden Admin Corner (triple-tap top-right) ───────────────────────────────
export function HiddenAdminCorner({ onUnlock }: { onUnlock: () => void }) {
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleTap = () => {
    tapCount.current++;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      onUnlock();
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1000);
    }
  };

  return (
    <div
      onClick={handleTap}
      className="fixed top-0 right-0 w-16 h-16 z-30 cursor-default"
      aria-hidden="true"
    />
  );
}

// ── Idle Countdown Modal ─────────────────────────────────────────────────────
export function IdleCountdownModal({ secondsLeft, onDismiss }: { secondsLeft: number; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {secondsLeft > 0 && secondsLeft <= 10 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="glass-card rounded-lg p-8 text-center max-w-sm"
          >
            <p className="text-muted-foreground text-sm uppercase tracking-wider font-semibold mb-2">Going to sleep in</p>
            <motion.span
              key={secondsLeft}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-black text-primary block"
            >
              {secondsLeft}
            </motion.span>
            <p className="text-muted-foreground text-xs mt-4">Tap anywhere to stay awake</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
