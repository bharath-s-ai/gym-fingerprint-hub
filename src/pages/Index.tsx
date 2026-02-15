import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FingerprintScanner } from "@/components/gym/FingerprintScanner";
import { ModeToggle } from "@/components/gym/ModeToggle";
import { StatusDisplay, type StatusType } from "@/components/gym/StatusDisplay";
import { MemberCard } from "@/components/gym/MemberCard";
import { EnrollmentForm } from "@/components/gym/EnrollmentForm";
import { useFingerprint } from "@/hooks/useFingerprint";
import { Button } from "@/components/ui/button";

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

const Index = () => {
  const [mode, setMode] = useState<"enrollment" | "checkin">("checkin");
  const [status, setStatus] = useState<Status>({ message: "Initializing system...", type: "waiting" });
  const [member, setMember] = useState<Member | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { initialize, capture, match } = useFingerprint();

  useEffect(() => {
    initialize()
      .then(() => setStatus({ message: "System ready — select a mode to begin", type: "success" }))
      .catch((err) => setStatus({ message: err.message, type: "error" }));
  }, [initialize]);

  const handleEnrollment = useCallback(async (phone: string) => {
    setIsScanning(true);
    setMember(null);
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

      setStatus({ message: "Fingerprint enrolled successfully!", type: "success" });
    } catch (error: any) {
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  }, [capture]);

  const handleCheckIn = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setMember(null);
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
        setStatus({ message: "Fingerprint not recognized", type: "error" });
        setTimeout(() => setStatus({ message: "Ready for check-in", type: "info" }), 3000);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isExpired = new Date(matched.expiry_date) < new Date();

      if (isExpired || !matched.active) {
        setMember(matched);
        setStatus({ message: "Membership expired! Please renew.", type: "error" });
        setTimeout(() => { setMember(null); setStatus({ message: "Ready for check-in", type: "info" }); }, 5000);
        return;
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", matched.id)
        .gte("check_in", today.toISOString())
        .maybeSingle();

      if (existing) {
        setMember(matched);
        setStatus({ message: "Already checked in today!", type: "warning" });
        setTimeout(() => { setMember(null); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
        return;
      }

      await supabase.from("attendance").insert({ member_id: matched.id });
      setMember(matched);
      setStatus({ message: `Welcome, ${matched.name}!`, type: "success" });
      setTimeout(() => { setMember(null); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
    } catch (error: any) {
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, capture, match]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg glass-card rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="gradient-primary p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
            <h1 className="text-3xl font-black text-primary-foreground tracking-tight">F2F GYM</h1>
          </div>
          <p className="text-primary-foreground/70 text-sm font-medium">
            Fingerprint Attendance System
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="p-6 pb-0">
          <ModeToggle currentMode={mode} onModeChange={setMode} />
        </div>

        {/* Scanner */}
        <div className="py-8">
          <FingerprintScanner isScanning={isScanning} mode={mode} />
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
              className="w-full h-14 gradient-success text-success-foreground font-bold text-base rounded-xl hover:opacity-90 transition-all active:scale-[0.98]"
            >
              {isScanning ? "Scanning..." : "Start Check-in"}
            </Button>
          )}

          <AnimatePresence>
            {member && <MemberCard member={member} />}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="bg-background/50 p-4 text-center">
          <Link to="/dashboard" className="text-muted-foreground text-xs hover:text-primary transition-colors">
            📊 Member Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
