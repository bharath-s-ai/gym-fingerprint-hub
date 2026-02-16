import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { FingerprintScanner } from "@/components/gym/FingerprintScanner";
import { ModeToggle } from "@/components/gym/ModeToggle";
import { StatusDisplay, type StatusType } from "@/components/gym/StatusDisplay";
import { MemberCard } from "@/components/gym/MemberCard";
import { EnrollmentForm } from "@/components/gym/EnrollmentForm";
import { useFingerprint } from "@/hooks/useFingerprint";
import { Button } from "@/components/ui/button";
import logo from "@/assets/f2f-logo.jpg";

interface Status {
  message: string;
  type: StatusType;
}

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  joining_date?: string | null;
  expiry_date: string;
  active: boolean;
  fingerprint_template?: string | null;
}

const IDLE_TIMEOUT = 30000;

const Index = () => {
  const [mode, setMode] = useState<"enrollment" | "checkin">("checkin");
  const [status, setStatus] = useState<Status>({ message: "Initializing system...", type: "waiting" });
  const [member, setMember] = useState<Member | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<"idle" | "success" | "error">("idle");
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const { initialize, capture, match } = useFingerprint();

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    const events = ["mousedown", "touchstart", "keydown"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    initialize()
      .then(() => setStatus({ message: "System ready — select a mode to begin", type: "success" }))
      .catch((err) => setStatus({ message: err.message, type: "error" }));
  }, [initialize]);

  const handleEnrollment = useCallback(async (phone: string) => {
    setIsScanning(true);
    setMember(null);
    setScannerStatus("idle");
    setStatus({ message: "Looking up member...", type: "waiting" });

    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("phone", phone)
        .maybeSingle();

      if (error) throw new Error("Database error");
      if (!data) throw new Error("No member found with that phone number");

      setMember(data as Member);
      setStatus({ message: "Place finger on scanner (1/3)...", type: "waiting" });

      const templates: string[] = [];
      for (let i = 0; i < 3; i++) {
        const template = await capture();
        templates.push(template);
        if (i < 2) {
          setStatus({ message: `Place finger again (${i + 2}/3)...`, type: "waiting" });
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      await supabase
        .from("members")
        .update({ fingerprint_template: templates[0] })
        .eq("id", data.id);

      setScannerStatus("success");
      setStatus({ message: "Fingerprint enrolled successfully!", type: "success" });
    } catch (error: any) {
      setScannerStatus("error");
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  }, [capture]);

  const handleCheckIn = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setMember(null);
    setScannerStatus("idle");
    setStatus({ message: "Place finger on scanner...", type: "waiting" });

    try {
      const scannedTemplate = await capture();
      setStatus({ message: "Matching fingerprint...", type: "waiting" });

      const { data: members } = await supabase
        .from("members")
        .select("*")
        .not("fingerprint_template", "is", null)
        .eq("active", true);

      let matched: Member | null = null;
      for (const m of members || []) {
        const isMatch = await match(scannedTemplate, m.fingerprint_template!);
        if (isMatch) {
          matched = m as Member;
          break;
        }
      }

      if (!matched) {
        setScannerStatus("error");
        setStatus({ message: "Fingerprint not recognized", type: "error" });
        setTimeout(() => { setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isExpired = new Date(matched.expiry_date) < new Date();

      if (isExpired || !matched.active) {
        setScannerStatus("error");
        setMember(matched);
        setStatus({ message: "Membership expired — renew at front desk", type: "error" });
        setTimeout(() => { setMember(null); setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 5000);
        return;
      }

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", matched.id)
        .gte("check_in", today.toISOString())
        .maybeSingle();

      if (existing) {
        setMember(matched);
        setScannerStatus("success");
        setStatus({ message: "Already checked in today!", type: "warning" });
        setTimeout(() => { setMember(null); setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
        return;
      }

      await supabase.from("attendance").insert({ member_id: matched.id });
      setMember(matched);
      setScannerStatus("success");
      setStatus({ message: `Welcome, ${matched.name}!`, type: "success" });
      setTimeout(() => { setMember(null); setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
    } catch (error: any) {
      setScannerStatus("error");
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, capture, match]);

  // Idle screen
  if (isIdle) {
    return (
      <div
        className="min-h-screen gradient-bg flex flex-col items-center justify-center p-6 cursor-pointer"
        onClick={resetIdleTimer}
        onTouchStart={resetIdleTimer}
      >
        <img src={logo} alt="F2F Logo" className="w-40 h-40 object-contain mb-8" />
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Button className="bg-primary text-primary-foreground px-12 py-6 text-xl font-bold uppercase tracking-widest hover:bg-primary/90 rounded-lg">
            Tap to Start
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-lg glass-card rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary p-6 flex items-center gap-4">
          <img src={logo} alt="F2F Logo" className="w-14 h-14 object-contain rounded-lg" />
          <div>
            <h1 className="text-2xl font-black text-primary-foreground tracking-tight uppercase">
              F2F Fitness
            </h1>
            <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-widest">
              Attendance System
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="p-6 pb-0">
          <ModeToggle currentMode={mode} onModeChange={setMode} />
        </div>

        {/* Scanner */}
        <div className="py-8">
          <FingerprintScanner isScanning={isScanning} mode={mode} status={scannerStatus} />
        </div>

        {/* Status */}
        <div className="px-6">
          <StatusDisplay message={status.message} type={status.type} />
        </div>

        {/* Actions */}
        <div className="p-6 space-y-4">
          {mode === "enrollment" ? (
            <EnrollmentForm onSubmit={handleEnrollment} isProcessing={isScanning} />
          ) : (
            <Button
              onClick={handleCheckIn}
              disabled={isScanning}
              className="w-full h-14 bg-success text-success-foreground font-bold text-lg uppercase tracking-wider rounded-lg hover:bg-success/90 hover:scale-105 hover:shadow-[0_0_20px_hsl(142_71%_45%/0.25)] transition-all duration-200 active:scale-[0.98]"
            >
              {isScanning ? "Scanning..." : "Start Check-in"}
            </Button>
          )}

          <AnimatePresence>
            {member && <MemberCard member={member} />}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-primary/20 p-4 text-center">
          <Link to="/dashboard" className="text-muted-foreground text-xs font-semibold uppercase tracking-wider hover:text-primary transition-colors">
            📊 Member Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Index;
