import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FingerprintScanner } from "@/components/gym/FingerprintScanner";
import { ModeToggle } from "@/components/gym/ModeToggle";
import { StatusDisplay, type StatusType } from "@/components/gym/StatusDisplay";
import { MemberCard } from "@/components/gym/MemberCard";
import { EnrollmentForm } from "@/components/gym/EnrollmentForm";
import { WarriorWelcome } from "@/components/gym/WarriorWelcome";
import { HardwareStatusBar } from "@/components/gym/HardwareStatusBar";
import { MemberProfilePanel } from "@/components/gym/MemberProfilePanel";
import { useFingerprint } from "@/hooks/useFingerprint";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HiddenAdminCorner, IdleCountdownModal, FullscreenToggle, AlwaysOnTopToggle, AutoStartToggle } from "@/components/gym/KioskControls";
import { MuteToggle } from "@/components/gym/MuteToggle";
import { useElectron } from "@/hooks/useElectron";
import { Fingerprint, Settings as SettingsIcon, RefreshCw } from "lucide-react";
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
  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  // Welcome overlay state
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeData, setWelcomeData] = useState({ name: "", memberId: null as number | null, daysRemaining: 0, streak: 0, totalVisits: 0 });
  // Member stats for card
  const [memberStats, setMemberStats] = useState({ totalVisits: 0, lastCheckIn: null as string | null, streak: 0 });
  const [profileMember, setProfileMember] = useState<Member | null>(null);

  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const countdownTimer = useRef<ReturnType<typeof setInterval>>();
  const {
    status: deviceStatus,
    error: deviceError,
    settings: deviceSettings,
    bridgeReady,
    isConnected,
    connect,
    enroll: enrollOnDevice,
    verify: verifyOnDevice,
    fetchLogs,
  } = useFingerprint();
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

  // Auto-connect on mount if device IP is configured & bridge available
  useEffect(() => {
    if (!bridgeReady) {
      setStatus({ message: "Desktop bridge not detected — open the desktop app", type: "warning" });
      return;
    }
    if (!deviceSettings.ip) {
      setStatus({ message: "Configure device in Settings to begin", type: "warning" });
      return;
    }
    connect()
      .then(() => setStatus({ message: "System ready — select a mode to begin", type: "success" }))
      .catch((err) => {
        setStatus({ message: err.message, type: "error" });
        toast.error(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeReady]);

  // Sync attendance logs from device → Supabase
  const handleSyncLogs = useCallback(async () => {
    if (!isConnected) {
      toast.error("Device not connected");
      return;
    }
    setIsSyncingLogs(true);
    try {
      const logs = await fetchLogs();
      if (logs.length === 0) {
        toast.info("No new logs on device");
        return;
      }
      // Map device userId → member.id, then insert attendance rows
      const userIds = [...new Set(logs.map((l) => l.userId))];
      const { data: members } = await supabase
        .from("members")
        .select("id, member_id")
        .in("member_id", userIds.map((u) => parseInt(u, 10)).filter((n) => !Number.isNaN(n)));

      const idMap = new Map<string, string>();
      (members || []).forEach((m) => {
        if (m.member_id != null) idMap.set(String(m.member_id), m.id);
      });

      const rows = logs
        .map((l) => {
          const memberUuid = idMap.get(l.userId);
          return memberUuid ? { member_id: memberUuid, check_in: l.timestamp } : null;
        })
        .filter((r): r is { member_id: string; check_in: string } => r !== null);

      if (rows.length === 0) {
        toast.warning("Logs found but no matching members");
        return;
      }

      const { error } = await supabase.from("attendance").insert(rows);
      if (error) throw error;
      toast.success(`Synced ${rows.length} attendance ${rows.length === 1 ? "record" : "records"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setIsSyncingLogs(false);
    }
  }, [isConnected, fetchLogs]);

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
      if (!isConnected) throw new Error("Device not connected — open Settings");

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", parseInt(warriorId, 10))
        .maybeSingle();

      if (error) throw new Error("Database error");
      if (!data) throw new Error("No warrior found with ID #" + warriorId);

      setMember(data as Member);
      setStatus({ message: "Place finger on scanner — 3 samples required", type: "waiting" });
      setEnrollProgress(1);

      // Single device-side enroll call captures all 3 samples internally
      const template = await enrollOnDevice(warriorId);
      setEnrollProgress(3);

      await supabase
        .from("members")
        .update({ fingerprint_template: template })
        .eq("id", data.id);

      setScannerStatus("success");
      play("success");
      setStatus({ message: "Fingerprint enrolled successfully!", type: "success" });
      toast.success("Fingerprint enrolled");
    } catch (error: any) {
      setScannerStatus("error");
      setEnrollProgress(0);
      play("error");
      setStatus({ message: error.message, type: "error" });
      toast.error(error.message);
    } finally {
      setIsScanning(false);
    }
  }, [enrollOnDevice, isConnected, play]);

  const handleCheckIn = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    setMember(null);
    setScannerStatus("idle");
    setMemberStats({ totalVisits: 0, lastCheckIn: null, streak: 0 });
    play("tap");
    setStatus({ message: "Place finger on scanner...", type: "waiting" });

    try {
      if (!isConnected) throw new Error("Device not connected — open Settings");

      const matchedUserId = await verifyOnDevice();
      if (!matchedUserId) {
        setScannerStatus("error");
        play("error");
        setStatus({ message: "Fingerprint not recognized", type: "error" });
        toast.error("Fingerprint not recognized");
        setTimeout(() => { setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
        return;
      }

      setStatus({ message: "Looking up member...", type: "waiting" });
      const { data: matched } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", parseInt(matchedUserId, 10))
        .maybeSingle();

      if (!matched) {
        setScannerStatus("error");
        play("error");
        setStatus({ message: "Member record not found", type: "error" });
        toast.error("Member record not found");
        setTimeout(() => { setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 3000);
        return;
      }

      const memberRow = matched as Member;

      // Fetch stats for card display
      const [totalVisits, lastCheckIn, streak] = await Promise.all([
        getTotalVisits(memberRow.id),
        getLastCheckIn(memberRow.id),
        computeStreak(memberRow.id),
      ]);
      setMemberStats({ totalVisits, lastCheckIn, streak });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isExpired = new Date(memberRow.expiry_date) < new Date();

      if (isExpired || !memberRow.active) {
        setScannerStatus("error");
        setMember(memberRow);
        play("error");
        setStatus({ message: "Membership expired — renew at front desk", type: "error" });
        setTimeout(() => { setMember(null); setScannerStatus("idle"); setStatus({ message: "Ready for check-in", type: "info" }); }, 5000);
        return;
      }

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", memberRow.id)
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
  }, [isScanning, verifyOnDevice, isConnected, play, showWelcomeOverlay]);

  // Idle screen
  if (isIdle) {
    return (
      <div
        className="min-h-screen gradient-bg flex flex-col items-center justify-center p-6 cursor-pointer relative overflow-hidden"
        onClick={resetIdleTimer}
        onTouchStart={resetIdleTimer}
      >
        {/* Ambient orb */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] animate-glow-pulse pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(25 95% 53% / 0.1) 0%, transparent 70%)" }}
        />

        <motion.img
          src={logo}
          alt="F2F Logo"
          className="w-20 h-20 sm:w-32 sm:h-32 object-contain mb-4 sm:mb-6 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mb-6 sm:mb-10 relative z-10"
        >
          <Fingerprint className="w-16 h-16 sm:w-24 sm:h-24 text-primary drop-shadow-[0_0_30px_hsl(25_95%_53%/0.4)]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative z-10"
        >
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Button className="bg-primary text-primary-foreground px-8 sm:px-14 py-5 sm:py-7 text-base sm:text-xl font-black uppercase tracking-[0.2em] hover:bg-primary/90 rounded-xl glow-primary transition-shadow duration-300 hover:glow-primary-intense">
              Tap to Start
            </Button>
          </motion.div>
        </motion.div>

        {/* Swipe-up hint — mobile only */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="sm:hidden absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
              <path d="M12 19V5M12 5l-5 5M12 5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Swipe up to begin
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col relative overflow-hidden">
      {/* Ambient top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(25 95% 53% / 0.07) 0%, transparent 70%)" }}
      />
      <HiddenAdminCorner onUnlock={() => navigate("/dashboard")} />
      <IdleCountdownModal secondsLeft={countdown} onDismiss={resetIdleTimer} />
      <WarriorWelcome visible={welcomeVisible} {...welcomeData} />
      <MemberProfilePanel
        member={profileMember}
        onClose={() => setProfileMember(null)}
        onUpdate={() => setProfileMember(null)}
      />

      {/* Hardware Status Bar */}
      <HardwareStatusBar
        status={deviceStatus}
        deviceIp={deviceSettings.ip || undefined}
        errorMessage={deviceError}
        onRetry={() => {
          connect().catch((e) => toast.error(e?.message ?? "Connection failed"));
        }}
        onOpenSettings={() => navigate("/settings")}
      />


      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-lg glass-card rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary via-primary to-primary/90 px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 overflow-hidden">
            {/* Subtle diagonal accent */}
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary-foreground/5 rounded-full blur-2xl pointer-events-none" />
            <img src={logo} alt="F2F Logo" className="w-11 h-11 object-contain rounded-lg border border-primary-foreground/10 relative z-10" />
            <div className="flex-1 relative z-10">
              <h1 className="text-base sm:text-xl font-black text-primary-foreground tracking-tight uppercase leading-none">
                F2F Fitness
              </h1>
              <p className="text-primary-foreground/60 text-[10px] font-bold uppercase tracking-[0.25em] mt-0.5">
                Attendance System
              </p>
            </div>
            <div className="flex items-center gap-1.5 relative z-10">
              <AutoStartToggle />
              <AlwaysOnTopToggle />
              <MuteToggle muted={muted} onToggle={toggleMute} />
              <FullscreenToggle />
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="p-4 sm:p-6 pb-0">
            <ModeToggle currentMode={mode} onModeChange={setMode} />
          </div>

          {/* Scanner */}
          <div className="py-5 sm:py-8">
            <FingerprintScanner isScanning={isScanning} mode={mode} status={scannerStatus} />
          </div>

          {/* Status */}
          <div className="px-4 sm:px-6">
            <StatusDisplay message={status.message} type={status.type} />
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-6 space-y-4">
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
                className="w-full h-16 bg-primary text-primary-foreground font-black text-lg uppercase tracking-[0.2em] rounded-xl hover:bg-primary/90 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] glow-primary hover:glow-primary-intense"
              >
                {isScanning ? "SCANNING..." : "START CHECK-IN"}
              </Button>
            )}

            <AnimatePresence>
              {member && (
                <div className="cursor-pointer" onClick={() => setProfileMember(member)}>
                  <MemberCard
                    member={member}
                    totalVisits={memberStats.totalVisits}
                    lastCheckIn={memberStats.lastCheckIn}
                    streak={memberStats.streak}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-primary/10 px-5 py-3.5 flex items-center justify-center">
            <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-[0.2em] hover:text-primary transition-colors duration-200">
              <span>📊</span>
              <span>Member Dashboard</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
