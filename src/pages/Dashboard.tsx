import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Fingerprint, Calendar, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import logo from "@/assets/f2f-logo.jpg";

interface Member {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  joining_date: string | null;
  expiry_date: string;
  active: boolean | null;
  fingerprint_template: string | null;
  attendance_count: number;
  last_check_in: string | null;
}

function SkeletonRow() {
  return (
    <TableRow className="border-border/30">
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 rounded bg-gradient-to-r from-muted via-muted/70 to-muted animate-shimmer" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function StatCardSkeleton() {
  return (
    <div className="glass-card rounded-lg p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-lg bg-muted animate-shimmer" />
      <div className="space-y-2 flex-1">
        <div className="h-8 w-16 rounded bg-muted animate-shimmer" />
        <div className="h-3 w-24 rounded bg-muted animate-shimmer" />
      </div>
    </div>
  );
}

const Dashboard = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data: membersData } = await supabase
        .from("members")
        .select("*")
        .order("name");

      if (!membersData) {
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        membersData.map(async (m) => {
          const { count } = await supabase
            .from("attendance")
            .select("*", { count: "exact", head: true })
            .eq("member_id", m.id);

          const { data: lastAttendance } = await supabase
            .from("attendance")
            .select("check_in")
            .eq("member_id", m.id)
            .order("check_in", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...m,
            attendance_count: count || 0,
            last_check_in: lastAttendance?.check_in || null,
          };
        })
      );

      setMembers(enriched);
      setLoading(false);
    };

    fetchMembers();
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  );

  const isExpired = (date: string) => new Date(date) < new Date();

  const stats = [
    {
      icon: Users,
      label: "ACTIVE MEMBERS",
      value: members.filter((m) => m.active && !isExpired(m.expiry_date)).length,
    },
    {
      icon: Fingerprint,
      label: "ENROLLED",
      value: members.filter((m) => m.fingerprint_template).length,
    },
    {
      icon: Calendar,
      label: "EXPIRED",
      value: members.filter((m) => isExpired(m.expiry_date)).length,
    },
  ];

  return (
    <div className="min-h-screen gradient-bg p-6">
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon" className="border-primary/30 bg-muted/50 text-primary hover:bg-primary/10 hover:border-primary/50 min-h-[48px] min-w-[48px]">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <img src={logo} alt="F2F" className="w-10 h-10 object-contain rounded-lg hidden sm:block" />
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Member Dashboard</h1>
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                {members.length} total warriors
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
            : stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                  className="glass-card-hover rounded-lg p-5 flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-4xl font-black text-foreground">{stat.value}</p>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search warriors by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 bg-muted/50 border-border h-14 text-lg focus:border-primary focus:shadow-[0_0_0_3px_hsl(25_95%_53%/0.1)]"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="glass-card rounded-lg overflow-hidden">
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20 hover:bg-transparent">
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Name</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Phone</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Status</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Enrolled</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Expiry</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold text-right">Check-ins</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </TableBody>
            </Table>
          ) : filtered.length === 0 && members.length === 0 ? (
            /* Empty state — no members */
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="relative mb-6">
                <Fingerprint className="w-20 h-20 text-muted-foreground/30" />
                <span className="absolute -bottom-1 -right-1 text-3xl">❓</span>
              </div>
              <h3 className="text-xl font-black text-foreground uppercase tracking-wide mb-2">No Warriors Enrolled Yet</h3>
              <p className="text-muted-foreground text-sm mb-6">Start building your roster — enroll your first member</p>
              <Link to="/">
                <Button className="bg-primary text-primary-foreground font-bold uppercase tracking-wider px-8 py-4 text-lg hover:bg-primary/90 hover:scale-105 transition-all duration-200">
                  Enroll First Member
                </Button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state — no search results */
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <Search className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">No Matches Found</h3>
              <p className="text-muted-foreground text-sm mb-4">Try a different name or phone number</p>
              <Button variant="outline" onClick={() => setSearch("")} className="border-primary/30 text-primary hover:bg-primary/10 font-semibold uppercase tracking-wider">
                Clear Filters
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-primary/20 hover:bg-transparent">
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Name</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Phone</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Status</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Enrolled</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Expiry</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold text-right">Check-ins</TableHead>
                  <TableHead className="uppercase text-xs tracking-wider text-muted-foreground font-semibold">Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="border-border/30 hover:bg-primary/5 hover:border-l-2 hover:border-l-primary transition-all group"
                  >
                    <TableCell className="font-bold text-foreground">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                    <TableCell>
                      {!m.active || isExpired(m.expiry_date) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-destructive/20 text-destructive border border-destructive/30">
                          EXPIRED
                        </span>
                      ) : m.fingerprint_template ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-success/20 text-success border border-success/30">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                          PENDING
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.fingerprint_template ? (
                        <Fingerprint className="w-5 h-5 text-primary" />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(m.expiry_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-black text-foreground text-lg">
                      {m.attendance_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.last_check_in
                        ? format(new Date(m.last_check_in), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
