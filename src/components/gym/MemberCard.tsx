import { motion } from "framer-motion";
import { User, Phone, Calendar, Shield, Hash } from "lucide-react";

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
}

export function MemberCard({ member }: MemberCardProps) {
  const isExpired = new Date(member.expiry_date) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card rounded-lg p-5 space-y-3 border-l-2 border-l-primary"
    >
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Phone className="w-3 h-3" />
            <span>{member.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
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
    </motion.div>
  );
}
