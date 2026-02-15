import { useState, useCallback } from "react";

export function useFingerprint() {
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 1000));
    setIsInitialized(true);
    return true;
  }, []);

  const capture = useCallback(async () => {
    if (!isInitialized) throw new Error("Scanner not initialized");
    await new Promise((r) => setTimeout(r, 2000));
    return `TEMPLATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, [isInitialized]);

  const match = useCallback(async (template1: string, template2: string) => {
    await new Promise((r) => setTimeout(r, 500));
    return template1.split("_")[1] === template2.split("_")[1];
  }, []);

  return { initialize, capture, match, isInitialized };
}
