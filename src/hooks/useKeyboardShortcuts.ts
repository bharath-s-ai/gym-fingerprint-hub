import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface ShortcutHandlers {
  onModeChange?: (mode: "enrollment" | "checkin") => void;
}

export function useKeyboardShortcuts({ onModeChange }: ShortcutHandlers = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "e":
          onModeChange?.("enrollment");
          break;
        case "c":
          onModeChange?.("checkin");
          break;
        case "d":
          if (location.pathname !== "/dashboard") navigate("/dashboard");
          break;
        case "escape":
          if (location.pathname !== "/") navigate("/");
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, location.pathname, onModeChange]);
}
