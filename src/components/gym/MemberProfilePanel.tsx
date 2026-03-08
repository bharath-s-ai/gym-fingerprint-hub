import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { X, User, Phone, Mail, Calendar, Shield, Fingerprint, Trash2, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  member_id?: number | null;
  joining_date?: string | null;
  expiry_date: string;
  active?: boolean | null;
  fingerprint_template?: string | null;
}

interface MemberProfilePanelProps {
  member: Member | null;
  onClose: () => void;
  onUpdate: () => void;
}

export function MemberProfilePanel({ member, onClose, onUpdate }: MemberProfilePanelProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [attendanceDays, setAttendanceDays] = useState<Set<string>>(new Set());
  const [recentActivity, setRecentActivity] = useState<{ check_in: string }[]>([]);

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setPhone(member.phone);
    setEmail(member.email || "");
    setEditing(false);
    setConfirmDelete(false);

    const fetchAttendance = async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("attendance")
        .select("check_in")
        .eq("member_id", member.id)
        .gte("check_in", thirtyDaysAgo)
        .order("check_in", { ascending: false });

      if (data) {
        const days = new Set(data.map((a) => format(new Date(a.check_in!), "yyyy-MM-dd")));
        setAttendanceDays(days);
        setRecentActivity(data.slice(0, 10) as { check_in: string }[]);
      }
    };
    fetchAttendance();
  }, [member]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    await supabase
      .from("members")
      .update({ name, phone, email: email || null })
      .eq("id", member.id);
    setSaving(false);
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!member) return;
    setDeleting(true);
    await supabase.from("attendance").delete().eq("member_id", member.id);
    await supabase.from("members").delete().eq("id", member.id);
    setDeleting(false);
    onClose();
    onUpdate();
  };

  const isExpired = member ? new Date(member.expiry_date) < new Date() : false;

  const last30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });

  return (
    <AnimatePresence>
      {member && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-primary p-5 flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-lg font-black text-primary-foreground uppercase tracking-wider">Member Profile</h2>
              <button onClick={onClose} className="text-primary-foreground/70 hover:text-primary-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  {editing ? (
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/50 border-border font-bold text-lg h-10" />
                  ) : (
                    <h3 className="text-2xl font-black text-foreground">{member.name}</h3>
                  )}
                  <div className={`flex items-center gap-1.5 mt-1 text-sm font-semibold ${isExpired ? "text-destructive" : "text-success"}`}>
                    <Shield className="w-4 h-4" />
                    <span>{isExpired ? "EXPIRED" : "ACTIVE"}</span>
                  </div>
                </div>
              </div>

              {/* Info Fields */}
              <div className="glass-card rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary" />
                  {editing ? (
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-muted/50 border-border h-9 flex-1" />
                  ) : (
                    <span className="text-foreground">{member.phone}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary" />
                  {editing ? (
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-muted/50 border-border h-9 flex-1" />
                  ) : (
                    <span className="text-muted-foreground">{member.email || "No email"}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground text-sm">
                    Joined: {member.joining_date ? format(new Date(member.joining_date), "MMM d, yyyy") : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground text-sm">
                    Expires: {format(new Date(member.expiry_date), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground text-sm">
                    {member.fingerprint_template ? "Fingerprint enrolled" : "Not enrolled"}
                  </span>
                </div>
              </div>

              {/* Edit / Save */}
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary/90 min-h-[48px]">
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)} className="border-border text-muted-foreground min-h-[48px]">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)} variant="outline" className="flex-1 border-primary/30 text-primary hover:bg-primary/10 font-semibold uppercase tracking-wider min-h-[48px]">
                    Edit Info
                  </Button>
                )}
              </div>

              {/* Fingerprint Placeholder */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fingerprint Template</h4>
                <div className="flex items-center justify-center h-24 rounded-lg bg-muted/30 border border-border">
                  {member.fingerprint_template ? (
                    <div className="flex items-center gap-3">
                      <Fingerprint className="w-10 h-10 text-primary animate-ring-pulse" />
                      <span className="text-xs text-muted-foreground font-mono break-all max-w-[200px] truncate">
                        {member.fingerprint_template.substring(0, 30)}...
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No template recorded</span>
                  )}
                </div>
              </div>

              {/* Attendance Heatmap (last 30 days) */}
              <div className="glass-card rounded-lg p-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Last 30 Days</h4>
                <div className="grid grid-cols-10 gap-1">
                  {last30.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const active = attendanceDays.has(key);
                    return (
                      <div
                        key={key}
                        title={format(day, "MMM d")}
                        className={`w-full aspect-square rounded-sm transition-colors ${
                          active ? "bg-primary" : "bg-muted/40"
                        }`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{attendanceDays.size} visits in 30 days</p>
              </div>

              {/* Recent Activity */}
              {recentActivity.length > 0 && (
                <div className="glass-card rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {recentActivity.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Clock className="w-3 h-3 text-primary" />
                        <span className="text-muted-foreground">
                          {format(new Date(a.check_in), "MMM d, yyyy — h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delete */}
              <div className="pt-4 border-t border-border">
                {confirmDelete ? (
                  <div className="space-y-2">
                    <p className="text-destructive text-sm font-semibold">Delete this member and all attendance records?</p>
                    <div className="flex gap-2">
                      <Button onClick={handleDelete} disabled={deleting} className="flex-1 bg-destructive text-destructive-foreground font-bold uppercase tracking-wider min-h-[48px]">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleting ? "Deleting..." : "Confirm Delete"}
                      </Button>
                      <Button variant="outline" onClick={() => setConfirmDelete(false)} className="border-border text-muted-foreground min-h-[48px]">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setConfirmDelete(true)} variant="outline" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold uppercase tracking-wider min-h-[48px]">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Member
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
