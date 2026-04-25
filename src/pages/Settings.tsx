import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Plug, PlugZap, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFingerprint } from "@/hooks/useFingerprint";
import { saveDeviceSettings } from "@/services/fingerprintService";

export default function Settings() {
  const { settings, status, error, connect, disconnect, bridgeReady } = useFingerprint();
  const [ip, setIp] = useState(settings.ip);
  const [port, setPort] = useState(String(settings.port));

  const handleSave = () => {
    const portNum = parseInt(port, 10) || 4370;
    saveDeviceSettings({ ip: ip.trim(), port: portNum });
    toast.success("Device settings saved");
  };

  const handleTestConnect = async () => {
    handleSave();
    try {
      await connect({ ip: ip.trim(), port: parseInt(port, 10) || 4370 });
      toast.success("Connected to device");
    } catch (e: any) {
      toast.error(e?.message ?? "Connection failed");
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.info("Disconnected");
  };

  return (
    <div className="min-h-screen gradient-bg p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-bold uppercase tracking-[0.2em] mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Device Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure the eSSL / ZKTeco fingerprint device connection.
            </p>
          </div>

          {!bridgeReady && (
            <div className="text-xs bg-warning/10 text-warning border border-warning/20 rounded-lg p-3">
              Fingerprint bridge not detected. Settings can still be saved — they'll
              activate once you launch the desktop app.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
                Device IP
              </label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.201"
                className="h-12 text-lg font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">
                Port
              </label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="4370"
                className="h-12 text-lg font-mono"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground uppercase tracking-wider font-bold">Status:</span>
              <span
                className={
                  status === "connected"
                    ? "text-success font-black uppercase"
                    : status === "connecting"
                      ? "text-warning font-black uppercase"
                      : status === "error"
                        ? "text-destructive font-black uppercase"
                        : "text-muted-foreground font-black uppercase"
                }
              >
                {status}
              </span>
              {error && <span className="text-destructive">— {error}</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} variant="outline" className="gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
            <Button
              onClick={handleTestConnect}
              disabled={status === "connecting"}
              className="gap-2"
            >
              {status === "connecting" ? (
                <RefreshCcw className="w-4 h-4 animate-spin" />
              ) : (
                <PlugZap className="w-4 h-4" />
              )}
              Save & Connect
            </Button>
            {status === "connected" && (
              <Button onClick={handleDisconnect} variant="destructive" className="gap-2">
                <Plug className="w-4 h-4" /> Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
