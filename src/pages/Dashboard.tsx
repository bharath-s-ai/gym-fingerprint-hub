import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Users, Fingerprint, Calendar, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

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

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="icon" className="border-border/50 bg-card/50">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Member Dashboard</h1>
              <p className="text-muted-foreground text-sm">{members.length} total members</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Users,
              label: "Active Members",
              value: members.filter((m) => m.active && !isExpired(m.expiry_date)).length,
              color: "text-[hsl(var(--success))]",
            },
            {
              icon: Fingerprint,
              label: "Enrolled",
              value: members.filter((m) => m.fingerprint_template).length,
              color: "text-primary",
            },
            {
              icon: Calendar,
              label: "Expired",
              value: members.filter((m) => isExpired(m.expiry_date)).length,
              color: "text-destructive",
            },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-muted-foreground text-xs">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Check-ins</TableHead>
                  <TableHead>Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id} className="border-border/30">
                    <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                    <TableCell>
                      {!m.active || isExpired(m.expiry_date) ? (
                        <Badge variant="destructive" className="text-xs">Expired</Badge>
                      ) : (
                        <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-xs">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.fingerprint_template ? (
                        <Fingerprint className="w-4 h-4 text-primary" />
                      ) : (
                        <span className="text-muted-foreground text-xs">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(m.expiry_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {m.attendance_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {m.last_check_in
                        ? format(new Date(m.last_check_in), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
