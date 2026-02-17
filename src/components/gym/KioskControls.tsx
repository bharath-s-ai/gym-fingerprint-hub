import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KioskControlsProps {
  children?: React.ReactNode;
}

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
    <Button
      onClick={toggleFullscreen}
      variant="outline"
      size="icon"
      className="border-primary/30 bg-muted/50 text-primary hover:bg-primary/10 hover:border-primary/50 min-h-[48px] min-w-[48px]"
      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
    >
      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
    </Button>
  );
}

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
