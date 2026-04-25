import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Fingerprint,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFingerprint } from "@/hooks/useFingerprint";
import { FingerprintError } from "@/services/fingerprintService";

interface Member {
  id: string;
  name: string;
  phone: string;
  member_id: number | null;
  fingerprint_template: string | null;
  active: boolean | null;
}

type FilterTab = "all" | "enrolled" | "pending";

export default function Enrollment() {
  const { status, enroll, bridgeReady } = useFingerprint();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .select("id, name, phone, member_id, fingerprint_template, active")
      .order("member_id", { ascending: true });
    if (error) {
      toast.error(error.message);
    } else {
      setMembers((data ?? []) as Member[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (tab === "enrolled" && !m.fingerprint_template) return false;
      if (tab === "pending" && m.fingerprint_template) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q) ||
        String(m.member_id ?? "").includes(q)
      );
    });
  }, [members, search, tab]);

  const counts = useMemo(() => {
    const enrolled = members.filter((m) => m.fingerprint_template).length;
    return { all: members.length, enrolled, pending: members.length - enrolled };
  }, [members]);

  const handleEnroll = async (member: Member) => {
    if (status !== "connected") {
      toast.error("Device not connected. Open Settings to connect.");
      return;
    }
    setBusyId(member.id);
    try {
      const template = await enroll(String(member.member_id ?? member.id));
      const { error } = await supabase
        .from("members")
        .update({ fingerprint_template: template })
        .eq("id", member.id);
      if (error) throw error;
      toast.success(`Fingerprint enrolled for ${member.name}`);
      await fetchMembers();
    } catch (e) {
      const msg = e instanceof FingerprintError ? e.message : (e as Error).message;
      toast.error(msg ?? "Enrollment failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const member = removeTarget;
    setRemoveTarget(null);
    setBusyId(member.id);
    try {
      const { error } = await supabase
        .from("members")
        .update({ fingerprint_template: null })
        .eq("id", member.id);
      if (error) throw error;
      toast.success(`Fingerprint removed for ${member.name}`);
      await fetchMembers();
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to remove fingerprint");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen gradient-bg p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-bold uppercase tracking-[0.2em]"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <DeviceStatusChip status={status} bridgeReady={bridgeReady} />
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-primary" />
            Enrollment Management
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enroll, re-enroll, or remove fingerprint templates for members.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total" value={counts.all} icon={<Users className="w-4 h-4" />} tone="muted" />
          <StatTile label="Enrolled" value={counts.enrolled} icon={<CheckCircle2 className="w-4 h-4" />} tone="success" />
          <StatTile label="Pending" value={counts.pending} icon={<AlertCircle className="w-4 h-4" />} tone="warning" />
        </div>

        {/* Search + Tabs */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or Warrior ID…"
              className="pl-10 pr-10 h-11"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="all" className="font-black uppercase text-xs tracking-wider">
                All ({counts.all})
              </TabsTrigger>
              <TabsTrigger value="enrolled" className="font-black uppercase text-xs tracking-wider">
                Enrolled ({counts.enrolled})
              </TabsTrigger>
              <TabsTrigger value="pending" className="font-black uppercase text-xs tracking-wider">
                Pending ({counts.pending})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              <MemberTable
                members={filtered}
                loading={loading}
                busyId={busyId}
                onEnroll={handleEnroll}
                onRemove={(m) => setRemoveTarget(m)}
                deviceConnected={status === "connected"}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove fingerprint?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the fingerprint template for{" "}
              <span className="font-bold text-foreground">{removeTarget?.name}</span>.
              They will need to re-enroll to use the scanner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function MemberTable({
  members,
  loading,
  busyId,
  onEnroll,
  onRemove,
  deviceConnected,
}: {
  members: Member[];
  loading: boolean;
  busyId: string | null;
  onEnroll: (m: Member) => void;
  onRemove: (m: Member) => void;
  deviceConnected: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-muted/30 animate-shimmer" />
        ))}
      </div>
    );
  }
  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm uppercase tracking-wider font-bold">
        No members match your filter
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-[11px] font-black uppercase tracking-wider">ID</TableHead>
            <TableHead className="text-[11px] font-black uppercase tracking-wider">Name</TableHead>
            <TableHead className="text-[11px] font-black uppercase tracking-wider hidden sm:table-cell">Phone</TableHead>
            <TableHead className="text-[11px] font-black uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-[11px] font-black uppercase tracking-wider text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => {
            const enrolled = !!m.fingerprint_template;
            const busy = busyId === m.id;
            return (
              <motion.tr
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-border/30"
              >
                <TableCell className="font-mono font-bold text-primary">
                  {m.member_id ?? "—"}
                </TableCell>
                <TableCell className="font-bold">{m.name}</TableCell>
                <TableCell className="font-mono text-muted-foreground hidden sm:table-cell">
                  {m.phone}
                </TableCell>
                <TableCell>
                  <EnrollmentBadge enrolled={enrolled} active={m.active !== false} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant={enrolled ? "outline" : "default"}
                      disabled={busy || !deviceConnected}
                      onClick={() => onEnroll(m)}
                      className="gap-1.5"
                    >
                      {busy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : enrolled ? (
                        <RefreshCw className="w-3.5 h-3.5" />
                      ) : (
                        <Fingerprint className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {enrolled ? "Re-enroll" : "Enroll"}
                      </span>
                    </Button>
                    {enrolled && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onRemove(m)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EnrollmentBadge({ enrolled, active }: { enrolled: boolean; active: boolean }) {
  if (!active) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest bg-muted/40 text-muted-foreground border-border">
        Inactive
      </span>
    );
  }
  return enrolled ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest bg-success/15 text-success border-success/30">
      <CheckCircle2 className="w-3 h-3" /> Enrolled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest bg-warning/15 text-warning border-warning/30">
      <AlertCircle className="w-3 h-3" /> Pending
    </span>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "success" | "warning" | "muted";
}) {
  const toneClass =
    tone === "success"
      ? "text-success bg-success/10 border-success/20"
      : tone === "warning"
        ? "text-warning bg-warning/10 border-warning/20"
        : "text-muted-foreground bg-muted/30 border-border";
  return (
    <div className={`glass-card rounded-xl p-4 border ${toneClass}`}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-2xl sm:text-3xl font-black mt-1">{value}</div>
    </div>
  );
}

function DeviceStatusChip({
  status,
  bridgeReady,
}: {
  status: string;
  bridgeReady: boolean;
}) {
  if (!bridgeReady) {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border bg-warning/10 text-warning border-warning/30">
        Bridge offline
      </span>
    );
  }
  const map: Record<string, string> = {
    connected: "bg-success/15 text-success border-success/30",
    connecting: "bg-warning/15 text-warning border-warning/30",
    error: "bg-destructive/15 text-destructive border-destructive/30",
    disconnected: "bg-muted/40 text-muted-foreground border-border",
  };
  return (
    <span
      className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
        map[status] ?? map.disconnected
      }`}
    >
      Device: {status}
    </span>
  );
}
