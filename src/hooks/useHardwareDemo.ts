/**
 * useHardwareDemo — Simulates eSSL hardware connection states
 * for visual testing in the browser preview.
 *
 * Cycle: connected (with varying latency) → disconnect → reconnect attempts → recovery
 */

import { useState, useEffect, useCallback, useRef } from "react";

const DEMO_PING_INTERVAL = 1500; // faster for demo
const DEMO_DISCONNECT_AFTER = 15000; // disconnect after 15s
const DEMO_MAX_ATTEMPTS = 5; // fewer attempts for demo
const DEMO_RECONNECT_DELAY = 2000;

export function useHardwareDemo() {
  const [isConnected, setIsConnected] = useState(true);
  const [latencyMs, setLatencyMs] = useState<number | null>(12);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const phase = useRef<"online" | "disconnected" | "recovering">("online");
  const tick = useRef(0);

  // Simulate latency pings when connected
  useEffect(() => {
    if (!isConnected) {
      setLatencyMs(null);
      return;
    }

    const interval = setInterval(() => {
      tick.current++;
      // Gradually increase latency to simulate degradation
      const base = 10 + Math.random() * 15;
      const spike = tick.current % 8 === 0 ? 60 + Math.random() * 40 : 0;
      setLatencyMs(Math.round(base + spike));
    }, DEMO_PING_INTERVAL);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Simulate disconnect after a period
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase.current === "online") {
        phase.current = "disconnected";
        setIsConnected(false);
        setReconnectAttempt(0);

        // Start simulated reconnect attempts
        let attempt = 0;
        const reconnectInterval = setInterval(() => {
          attempt++;
          setReconnectAttempt(attempt);

          if (attempt >= DEMO_MAX_ATTEMPTS) {
            clearInterval(reconnectInterval);
            phase.current = "recovering";
          }
        }, DEMO_RECONNECT_DELAY);
      }
    }, DEMO_DISCONNECT_AFTER);

    return () => clearTimeout(timer);
  }, []);

  const retryConnect = useCallback(() => {
    setReconnectAttempt(0);
    phase.current = "online";
    tick.current = 0;
    // Simulate successful reconnect after a brief delay
    setTimeout(() => {
      setIsConnected(true);
    }, 1000);
  }, []);

  return {
    isConnected,
    latencyMs,
    reconnectAttempt,
    maxReconnectAttempts: DEMO_MAX_ATTEMPTS,
    retryConnect,
  };
}
