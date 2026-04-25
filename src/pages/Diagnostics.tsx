import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Download,
  Trash2,
  Plug,
  AlertTriangle,
  Server,
  Clock,
  Database,
  FileWarning,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFingerprint } from "@/hooks/useFingerprint";
import { FingerprintError } from "@/services/fingerprintService";
import type { AttendanceLog } from "@/types/electron";

type TestState = "idle" | "running" | "success" | "failure";

const QUEUE_KEY = "f2f.unsyncedLogs";

function loadQueue(): AttendanceLog[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as AttendanceLog[]) : [];
  } catch {
    return [];
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Diagnostics() {
  const { status, error, settings, bridgeReady, connect, fetchLogs } = useFingerprint();

  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const [lastSyncAt, setLastSyncAt] = useState<string | null>(
    () => localStorage.getItem("f2f.lastSyncAt"),
  );
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [lastLog, setLastLog] = useState<AttendanceLog | null>(null);
  const [unsynced, setUnsynced] = useState<AttendanceLog[]>(() => loadQueue());
  const [fetching, setFetching] = useState(false);

  const [lastError, setLastError] = useState<string | null>(error);
  const [lastRetryAt, setLastRetryAt] = useState<string | null>(null);

  useEffect(() => {
    if (error) setLastError(error);
  }, [error]);

  const handleTestConnection = async () => {
    setTestState("running");
    setTestMessage(null);
    try {
      await connect();
      setTestState("success");
      setTestMessage(`Reached ${settings.ip || "device"} on port ${settings.port}`);
      toast.success("Connection test passed");
    } catch (e) {
      const msg = e instanceof FingerprintError ? e.message : "Connection failed";
      setTestState("failure");
      setTestMessage(msg);
      setLastError(msg);
      toast.error(msg);
    }
  };

  const handleReconnect = async () => {
    setLastRetryAt(new Date().toISOString());
    try {
      await connect();
      toast.success("Reconnected");
    } catch (e) {
      const msg = e instanceof FingerprintError ? e.message : "Reconnect failed";
      setLastError(msg);
      toast.error(msg);
    }
  };

  const handleFetchLogs = async () => {
    setFetching(true);
    try {
      const logs = await fetchLogs();
      setTotalLogs(logs.length);
      setLastLog(logs[logs.length - 1] ?? null);
      const stamp = new Date().toISOString();
      setLastSyncAt(stamp);
      localStorage.setItem("f2f.lastSyncAt", stamp);
      toast.success(`Fetched ${logs.length} logs`);
    } catch (e) {
      const msg = e instanceof FingerprintError ? e.message : "Fetch failed";
      setLastError(msg);
      toast.error(msg);
    } finally {
      setFetching(false);
    }
  };

  const handleClearQueue = () => {
    localStorage.removeItem(QUEUE_KEY);
    setUnsynced([]);
    toast.success("Local queue cleared");
  };

  return (
    <div className="min-h-screen gradient-bg p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-bold uppercase tracking-[0.2em]"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <Link
            to="/settings"
            className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
          >
            Device Settings →
          </Link>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Device Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Live health, logs, and recovery actions for the eSSL / ZKTeco scanner.
          </p>
        </div>

        {!bridgeReady && (
          <div className="flex items-center gap-3 text-xs bg-warning/10 text-warning border border-warning/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="normal-case">
              Hardware bridge not detected. Diagnostics still works, but actions will
              fail until the desktop app is running.
            </span>
          </div>
        )}

        {/* Connection Test */}
        <DiagCard
          icon={<Plug className="w-5 h-5" />}
          title="Connection Test"
          subtitle="Ping the device and verify the SDK handshake"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleTestConnection}
              disabled={testState === "running"}
              className="gap-2"
            >
              {testState === "running" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plug className="w-4 h-4" />
              )}
              Run Test
            </Button>
            <TestBadge state={testState} message={testMessage} />
          </div>
        </DiagCard>

        {/* Device Info + Logs Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DiagCard
            icon={<Server className="w-5 h-5" />}
            title="Device Info"
            subtitle="Current configured target"
          >
            <dl className="space-y-2 text-sm">
              <Row label="Device IP" value={settings.ip || "Not configured"} mono />
              <Row label="Port" value={String(settings.port)} mono />
              <Row
                label="Connection"
                value={
                  <StatusPill status={status} />
                }
              />
              <Row
                label="Last Sync"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {formatTime(lastSyncAt)}
                  </span>
                }
              />
            </dl>
          </DiagCard>

          <DiagCard
            icon={<Database className="w-5 h-5" />}
            title="Logs Summary"
            subtitle="Counts from the latest fetch"
          >
            <dl className="space-y-2 text-sm">
              <Row label="Total Device Logs" value={<span className="font-black text-lg text-primary">{totalLogs}</span>} />
              <Row
                label="Last Fetched Log"
                value={
                  lastLog
                    ? `${lastLog.userId} @ ${formatTime(lastLog.timestamp)}`
                    : "—"
                }
                mono={!!lastLog}
              />
              <Row
                label="Unsynced Queue"
                value={
                  <span
                    className={
                      unsynced.length > 0
                        ? "font-black text-warning"
                        : "font-black text-success"
                    }
                  >
                    {unsynced.length}
                  </span>
                }
              />
            </dl>
          </DiagCard>
        </div>

        {/* Error Panel */}
        <DiagCard
          icon={<FileWarning className="w-5 h-5" />}
          title="Error Panel"
          subtitle="Most recent failure surface"
          tone={lastError ? "destructive" : "default"}
        >
          {lastError ? (
            <div className="space-y-2 text-sm">
              <Row
                label="Last Error"
                value={<span className="text-destructive normal-case">{lastError}</span>}
              />
              <Row label="Last Retry" value={formatTime(lastRetryAt)} />
            </div>
          ) : (
            <p className="text-sm text-success font-bold uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              No errors recorded this session
            </p>
          )}
        </DiagCard>

        {/* Manual Actions */}
        <DiagCard
          icon={<RefreshCw className="w-5 h-5" />}
          title="Manual Actions"
          subtitle="Recovery and maintenance controls"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleReconnect}
              disabled={status === "connecting"}
              variant="outline"
              className="gap-2"
            >
              {status === "connecting" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Reconnect
            </Button>
            <Button
              onClick={handleFetchLogs}
              disabled={fetching || status !== "connected"}
              variant="outline"
              className="gap-2"
            >
              {fetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Fetch Logs
            </Button>
            <Button
              onClick={handleClearQueue}
              variant="destructive"
              disabled={unsynced.length === 0}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Local Queue
            </Button>
          </div>
        </DiagCard>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function DiagCard({
  icon,
  title,
  subtitle,
  tone = "default",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone?: "default" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`glass-card rounded-2xl p-5 sm:p-6 space-y-4 ${
        tone === "destructive" ? "border-destructive/30" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-9 h-9 rounded-lg grid place-items-center ${
            tone === "destructive"
              ? "bg-destructive/15 text-destructive"
              : "bg-primary/15 text-primary"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black uppercase tracking-wider">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <dt className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className={`text-right ${mono ? "font-mono text-sm" : "text-sm"}`}>{value}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: "bg-success/15 text-success border-success/30",
    connecting: "bg-warning/15 text-warning border-warning/30",
    error: "bg-destructive/15 text-destructive border-destructive/30",
    disconnected: "bg-muted/40 text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest ${
        map[status] ?? map.disconnected
      }`}
    >
      {status}
    </span>
  );
}

function TestBadge({ state, message }: { state: TestState; message: string | null }) {
  if (state === "idle")
    return (
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
        Not yet tested
      </span>
    );
  if (state === "running")
    return (
      <span className="text-xs text-warning uppercase tracking-wider font-black inline-flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…
      </span>
    );
  if (state === "success")
    return (
      <span className="text-xs text-success uppercase tracking-wider font-black inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4" />
        <span className="normal-case">{message ?? "OK"}</span>
      </span>
    );
  return (
    <span className="text-xs text-destructive uppercase tracking-wider font-black inline-flex items-center gap-1.5">
      <XCircle className="w-4 h-4" />
      <span className="normal-case">{message ?? "Failed"}</span>
    </span>
  );
}
