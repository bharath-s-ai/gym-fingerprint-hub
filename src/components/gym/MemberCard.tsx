import { motion } from "framer-motion";
import { User, Phone, Calendar, Shield } from "lucide-react";

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
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
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">{member.name}</h3>
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
        <div className={`flex items-center gap-1.5 font-semibold ${isExpired ? "text-destructive" : "text-success"}`}>
          <Shield className="w-4 h-4" />
          <span>{isExpired ? "EXPIRED" : "ACTIVE"}</span>
        </div>
      </div>
    </motion.div>
  );
}
