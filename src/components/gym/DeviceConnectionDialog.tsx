import { useState } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, Search, Usb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeviceConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (ip: string, port: number) => Promise<void>;
  onAutoDetect: () => Promise<{ success: boolean; found?: boolean; ip?: string | null }>;
  error?: string | null;
}

export function DeviceConnectionDialog({
  open,
  onOpenChange,
  onConnect,
  onAutoDetect,
  error,
}: DeviceConnectionDialogProps) {
  const [ip, setIp] = useState("192.168.1.201");
  const [port, setPort] = useState("4370");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setLocalError(null);
    try {
      await onConnect(ip, parseInt(port, 10));
      onOpenChange(false);
    } catch (e: any) {
      setLocalError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    setLocalError(null);
    try {
      const result = await onAutoDetect();
      if (result.found && result.ip) {
        setIp(result.ip);
        setLocalError(null);
      } else {
        setLocalError("No eSSL device found on the network");
      }
    } catch (e: any) {
      setLocalError(e.message);
    } finally {
      setIsDetecting(false);
    }
  };

  const displayError = localError || error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-primary" />
            Connect Fingerprint Device
          </DialogTitle>
          <DialogDescription>
            Connect to your eSSL K30 Pro via TCP/IP or USB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* IP & Port */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                IP Address
              </label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.1.201"
                disabled={isConnecting || isDetecting}
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                Port
              </label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="4370"
                disabled={isConnecting || isDetecting}
              />
            </div>
          </div>

          {/* Error */}
          {displayError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg"
            >
              <WifiOff className="w-4 h-4 shrink-0" />
              {displayError}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleAutoDetect}
              variant="outline"
              disabled={isConnecting || isDetecting}
              className="flex-1"
            >
              {isDetecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Auto-Detect
            </Button>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || isDetecting || !ip}
              className="flex-1"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 mr-2" />
              )}
              Connect
            </Button>
          </div>

          {/* USB fallback hint */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
            <Usb className="w-3.5 h-3.5" />
            <span>USB virtual COM port detected automatically as fallback</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
