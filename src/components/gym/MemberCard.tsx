import { motion } from "framer-motion";
import { User, Phone, Calendar, Shield, Hash, Trophy, Clock, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  member_id?: number | null;
  joining_date?: string | null;
  expiry_date: string;
  active: boolean;
}

interface MemberCardProps {
  member: Member;
  totalVisits?: number;
  lastCheckIn?: string | null;
  streak?: number;
  privacyMode?: boolean;
}

function getWarriorLevel(visits: number) {
  if (visits >= 200) return { label: "LEGEND", color: "text-primary", bg: "bg-primary/15 border-primary/30" };
  if (visits >= 100) return { label: "CHAMPION", color: "text-primary", bg: "bg-primary/15 border-primary/30" };
  if (visits >= 50) return { label: "ELITE", color: "text-success", bg: "bg-success/15 border-success/30" };
  if (visits >= 25) return { label: "WARRIOR", color: "text-warning", bg: "bg-warning/15 border-warning/30" };
  if (visits >= 10) return { label: "FIGHTER", color: "text-muted-foreground", bg: "bg-muted/30 border-border" };
  return { label: "ROOKIE", color: "text-muted-foreground", bg: "bg-muted/30 border-border" };
}

function maskValue(value: string) {
  if (value.length <= 4) return "••••";
  return value.slice(0, 2) + "••••" + value.slice(-2);
}

export function MemberCard({ member, totalVisits = 0, lastCheckIn, streak = 0, privacyMode = false }: MemberCardProps) {
  const isExpired = new Date(member.expiry_date) < new Date();
  const level = getWarriorLevel(totalVisits);

  // Membership progress ring calculation
  const now = new Date();
  const expiry = new Date(member.expiry_date);
  const join = member.joining_date ? new Date(member.joining_date) : now;
  const totalDuration = Math.max(expiry.getTime() - join.getTime(), 1);
  const elapsed = Math.max(now.getTime() - join.getTime(), 0);
  const progressPct = Math.min((elapsed / totalDuration) * 100, 100);
  const circumference = 2 * Math.PI * 26;
  const strokeDash = (progressPct / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card rounded-lg p-5 space-y-3 border-l-2 border-l-primary"
    >
      <div className="flex items-center gap-4">
        {/* Avatar with progress ring */}
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={isExpired ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-foreground text-xl uppercase tracking-tight truncate">
              {member.name}
            </h3>
            {member.member_id && (
              <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-primary/15 text-primary text-sm font-black tracking-tight">
                <Hash className="w-3.5 h-3.5" />
                {member.member_id}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Phone className="w-3 h-3" />
              <span>{privacyMode ? maskValue(member.phone) : member.phone}</span>
            </div>
            {/* Warrior Level */}
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-black uppercase tracking-wider ${level.bg} ${level.color}`}>
              <Trophy className="w-3 h-3" />
              {level.label}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Expires: {member.expiry_date}</span>
        </div>
        {isExpired ? (
          <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-destructive">
            <Shield className="w-4 h-4" />
            <span>EXPIRED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-success/15 border border-success/20">
            <Shield className="w-4 h-4 text-success" />
            <span className="font-black uppercase tracking-wider text-success text-xs">ACTIVE</span>
          </div>
        )}
      </div>

      {/* Last workout + streak */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {lastCheckIn && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Last workout: {formatDistanceToNow(new Date(lastCheckIn), { addSuffix: true })}</span>
          </div>
        )}
        {streak > 0 && (
          <div className="flex items-center gap-1 text-primary">
            <Flame className="w-3 h-3" />
            <span className="font-bold">{streak} day streak</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
