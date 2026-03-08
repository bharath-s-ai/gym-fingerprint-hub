import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { FingerprintScanner } from "@/components/gym/FingerprintScanner";
import { ModeToggle } from "@/components/gym/ModeToggle";
import { StatusDisplay, type StatusType } from "@/components/gym/StatusDisplay";
import { MemberCard } from "@/components/gym/MemberCard";
import { EnrollmentForm } from "@/components/gym/EnrollmentForm";
import { DeviceConnectionDialog } from "@/components/gym/DeviceConnectionDialog";
import { WarriorWelcome } from "@/components/gym/WarriorWelcome";
import { HardwareStatusBar } from "@/components/gym/HardwareStatusBar";
import { useFingerprint } from "@/hooks/useFingerprint";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HiddenAdminCorner, IdleCountdownModal, FullscreenToggle, AlwaysOnTopToggle, AutoStartToggle } from "@/components/gym/KioskControls";
import { MuteToggle } from "@/components/gym/MuteToggle";
import { useElectron } from "@/hooks/useElectron";
import { Fingerprint } from "lucide-react";
import logo from "@/assets/f2f-logo.jpg";
import { differenceInDays, subDays, format } from "date-fns";

interface Status {
  message: string;
  type: StatusType;
}

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  member_id?: number | null;
  joining_date?: string | null;
  expiry_date: string;
  active: boolean;
  fingerprint_template?: string | null;
}

const IDLE_TIMEOUT = 30000;
const COUNTDOWN_START = 10;
const WELCOME_DURATION = 3000;

// Helper: compute consecutive-day streak ending today/yesterday
async function computeStreak(memberId: string): Promise<number> {
  const { data } = await supabase
    .from("attendance")
    .select("check_in")
    .eq("member_id", memberId)
    .order("check_in", { ascending: false })
    .limit(60);
  if (!data || data.length === 0) return 0;

  const uniqueDays = [...new Set(data.map(a => format(new Date(a.check_in!), "yyyy-MM-dd")))];
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  let streak = 0;
  let checkDate = uniqueDays[0] === today || uniqueDays[0] === yesterday ? new Date(uniqueDays[0]) : null;
  if (!checkDate) return 0;

  for (const day of uniqueDays) {
    const expected = format(checkDate, "yyyy-MM-dd");
    if (day === expected) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }
  return streak;
}

async function getTotalVisits(memberId: string): Promise<number> {
  const { count } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("member_id", memberId);
  return count || 0;
}

async function getLastCheckIn(memberId: string): Promise<string | null> {
  const { data } = await supabase
    .from("attendance")
    .select("check_in")
    .eq("member_id", memberId)
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.check_in || null;
}

const Index = () => {
  const [mode, setMode] = useState<"enrollment" | "checkin">("checkin");
  const [status, setStatus] = useState<Status>({ message: "Initializing system...", type: "waiting" });
  const [member, setMember] = useState<Member | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<"idle" | "success" | "error">("idle");
  const [isIdle, setIsIdle] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  // Welcome overlay state
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeData, setWelcomeData] = useState({ name: "", memberId: null as number | null, daysRemaining: 0, streak: 0, totalVisits: 0 });
  // Member stats for card
  const [memberStats, setMemberStats] = useState({ totalVisits: 0, lastCheckIn: null as string | null, streak: 0 });

  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const countdownTimer = useRef<ReturnType<typeof setInterval>>();
  const { initialize, capture, match, connect, autoDetect, isConnected, isHardware, deviceError, latencyMs, reconnectAttempt } = useFingerprint();
  const { play, muted, toggleMute } = useSoundEffects();
  const { setTrayStatus } = useElectron();
  const navigate = useNavigate();
  useKeyboardShortcuts({ onModeChange: setMode });

  // Keep tray icon in sync with scanning state
  useEffect(() => {
    setTrayStatus(isScanning ? "scanning" : "ready");
  }, [isScanning, setTrayStatus]);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    setCountdown(0);
    clearTimeout(idleTimer.current);
    clearInterval(countdownTimer.current);
    idleTimer.current = setTimeout(() => {
      let sec = COUNTDOWN_START;
      setCountdown(sec);
      countdownTimer.current = setInterval(() => {
        sec--;
        if (sec <= 0) {
          clearInterval(countdownTimer.current);
          setCountdown(0);
          setIsIdle(true);
        } else {
          setCountdown(sec);
        }
      }, 1000);
    }, IDLE_TIMEOUT - COUNTDOWN_START * 1000);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    const events = ["mousedown", "touchstart", "keydown"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      clearTimeout(idleTimer.current);
      clearInterval(countdownTimer.current);
    };
  }, [resetIdleTimer]);

  useEffect(() => {
    initialize()
      .then(() => setStatus({ message: "System ready — select a mode to begin", type: "success" }))
      .catch((err) => {
        setStatus({ message: err.message, type: "error" });
        if (isHardware) setShowConnectionDialog(true);
      });
  }, [initialize, isHardware]);

  // Show welcome overlay with stats
  const showWelcomeOverlay = useCallback(async (matched: Member) => {
    const [totalVisits, streak] = await Promise.all([
      getTotalVisits(matched.id),
      computeStreak(matched.id),
    ]);
    const daysRemaining = differenceInDays(new Date(matched.expiry_date), new Date());

    setWelcomeData({
      name: matched.name,
      memberId: matched.member_id || null,
      daysRemaining,
      streak,
      totalVisits,
    });
    setWelcomeVisible(true);
    setTimeout(() => setWelcomeVisible(false), WELCOME_DURATION);
  }, []);

  const handleEnrollment = useCallback(async (warriorId: string) => {
    setIsScanning(true);
    setMember(null);
    setScannerStatus("idle");
    setEnrollProgress(0);
    play("tap");
    setStatus({ message: "Looking up warrior...", type: "waiting" });

    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", parseInt(warriorId, 10))
        .maybeSingle();

      if (error) throw new Error("Database error");
      if (!data) throw new Error("No warrior found with ID #" + warriorId);

      setMember(data as Member);

      const templates: string[] = [];
      for (let i = 0; i < 3; i++) {
        setStatus({ message: `Place finger on scanner (${i + 1}/3)...`, type: "waiting" });
        setEnrollProgress(i);
        const template = await capture();
        templates.push(template);
        setEnrollProgress(i + 1);
        play("tap");
        if (i < 2) {
          setStatus({ message: `Sample ${i + 1} captured! Lift finger...`, type: "success" });
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      await supabase
        .from("members")
        .update({ fingerprint_template: templates[0] })
        .eq("id", data.id);

      setScannerStatus("success");
      setEnrollProgress(3);
      play("success");
      setStatus({ message: "Fingerprint enrolled successfully!", type: "success" });
    } catch (error: any) {
      setScannerStatus("error");
      setEnrollProgress(0);
      play("error");
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  }, [capture, play]);

  const handleCheckIn = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setMember(null);
    setScannerStatus("idle");
    setMemberStats({ totalVisits: 0, lastCheckIn: null, streak: 0 });
    play("tap");
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
        play("error");
        setStatus({ message: "Fingerprint not recognized", type: "error" });
        setTimeout(() => { setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
        return;
      }

      // Fetch stats for card display
      const [totalVisits, lastCheckIn, streak] = await Promise.all([
        getTotalVisits(matched.id),
        getLastCheckIn(matched.id),
        computeStreak(matched.id),
      ]);
      setMemberStats({ totalVisits, lastCheckIn, streak });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isExpired = new Date(matched.expiry_date) < new Date();

      if (isExpired || !matched.active) {
        setScannerStatus("error");
        setMember(matched);
        play("error");
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
      play("success");
      setStatus({ message: `Welcome, ${matched.name}!`, type: "success" });

      // Show full-screen warrior welcome
      showWelcomeOverlay(matched);

      setTimeout(() => { setMember(null); setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, WELCOME_DURATION + 500);
    } catch (error: any) {
      setScannerStatus("error");
      play("error");
      setStatus({ message: error.message, type: "error" });
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, capture, match, play, showWelcomeOverlay]);

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
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8"
        >
          <Fingerprint className="w-24 h-24 text-primary" />
        </motion.div>
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
    <div className="min-h-screen gradient-bg flex flex-col relative">
      <HiddenAdminCorner onUnlock={() => navigate("/dashboard")} />
      <IdleCountdownModal secondsLeft={countdown} onDismiss={resetIdleTimer} />
      <WarriorWelcome visible={welcomeVisible} {...welcomeData} />
      <DeviceConnectionDialog
        open={showConnectionDialog}
        onOpenChange={setShowConnectionDialog}
        onConnect={async (ip, port) => { await connect(ip, port); }}
        onAutoDetect={async () => autoDetect()}
        error={deviceError}
      />

      {/* Hardware Status Bar */}
      <HardwareStatusBar
        isHardware={isHardware}
        isConnected={isConnected}
        deviceIp="192.168.1.201"
        latencyMs={latencyMs}
        reconnectAttempt={reconnectAttempt}
        onHighLatency={() => play("warning")}
        onDisconnect={() => play("error")}
      />

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-lg glass-card rounded-lg overflow-hidden"
        >
          {/* Header — compact */}
          <div className="bg-primary px-5 py-3 flex items-center gap-3">
            <img src={logo} alt="F2F Logo" className="w-10 h-10 object-contain rounded-md" />
            <div className="flex-1">
              <h1 className="text-lg font-black text-primary-foreground tracking-tight uppercase leading-tight">
                F2F Fitness
              </h1>
              <p className="text-primary-foreground/70 text-[10px] font-semibold uppercase tracking-widest">
                Attendance System
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AutoStartToggle />
              <AlwaysOnTopToggle />
              <MuteToggle muted={muted} onToggle={toggleMute} />
              <FullscreenToggle />
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
              <div className="space-y-3">
                <EnrollmentForm onSubmit={handleEnrollment} isProcessing={isScanning} />
                {isScanning && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Samples captured</span>
                      <span>{enrollProgress}/3</span>
                    </div>
                    <Progress value={(enrollProgress / 3) * 100} className="h-2" />
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={handleCheckIn}
                disabled={isScanning}
                className="w-full h-14 bg-primary text-primary-foreground font-black text-lg uppercase tracking-[0.15em] rounded-lg hover:bg-primary/90 hover:scale-[1.02] hover:shadow-[0_0_30px_hsl(25_95%_53%/0.3)] transition-all duration-200 active:scale-[0.98]"
              >
                {isScanning ? "SCANNING..." : "START CHECK-IN"}
              </Button>
            )}

            <AnimatePresence>
              {member && (
                <MemberCard
                  member={member}
                  totalVisits={memberStats.totalVisits}
                  lastCheckIn={memberStats.lastCheckIn}
                  streak={memberStats.streak}
                />
              )}
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
    </div>
  );
};

export default Index;
