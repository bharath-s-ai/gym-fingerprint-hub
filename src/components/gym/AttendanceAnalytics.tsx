import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Clock, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, startOfDay, subHours } from "date-fns";

interface HourlyData {
  hour: string;
  count: number;
  isPeak: boolean;
}

interface RecentCheckin {
  member_name: string;
  check_in: string;
}

export function AttendanceAnalytics() {
  const [todayCount, setTodayCount] = useState(0);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const todayStart = startOfDay(new Date()).toISOString();

      // Today's count
      const { count } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .gte("check_in", todayStart);
      setTodayCount(count || 0);

      // All today's checkins for hourly breakdown
      const { data: todayData } = await supabase
        .from("attendance")
        .select("check_in")
        .gte("check_in", todayStart)
        .order("check_in", { ascending: true });

      // Build hourly chart (6AM-10PM)
      const hours: HourlyData[] = [];
      const hourlyCounts: Record<number, number> = {};
      (todayData || []).forEach((a) => {
        if (a.check_in) {
          const h = new Date(a.check_in).getHours();
          hourlyCounts[h] = (hourlyCounts[h] || 0) + 1;
        }
      });

      let maxCount = 0;
      for (let h = 6; h <= 22; h++) {
        const c = hourlyCounts[h] || 0;
        if (c > maxCount) maxCount = c;
        hours.push({ hour: `${h > 12 ? h - 12 : h}${h >= 12 ? "P" : "A"}`, count: c, isPeak: false });
      }
      hours.forEach((h) => { if (h.count === maxCount && maxCount > 0) h.isPeak = true; });
      setHourlyData(hours);

      // Recent checkins with member names
      const { data: recent } = await supabase
        .from("attendance")
        .select("check_in, member_id")
        .order("check_in", { ascending: false })
        .limit(8);

      if (recent && recent.length > 0) {
        const memberIds = [...new Set(recent.map((r) => r.member_id))];
        const { data: members } = await supabase
          .from("members")
          .select("id, name")
          .in("id", memberIds);

        const nameMap = new Map((members || []).map((m) => [m.id, m.name]));
        setRecentCheckins(
          recent.map((r) => ({
            member_name: nameMap.get(r.member_id) || "Unknown",
            check_in: r.check_in || "",
          }))
        );
      }

      setLoading(false);
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const peakHour = hourlyData.find((h) => h.isPeak);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card rounded-lg p-5 h-48">
            <div className="h-4 w-24 rounded bg-muted animate-shimmer mb-4" />
            <div className="h-24 rounded bg-muted animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Today's Check-ins */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-hover rounded-lg p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Check-ins</h3>
        </div>
        <div className="flex items-end gap-2">
          <motion.span
            key={todayCount}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl font-black text-foreground"
          >
            {todayCount}
          </motion.span>
          <span className="text-muted-foreground text-sm mb-2">warriors</span>
        </div>
        {peakHour && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-primary">
            <Zap className="w-3 h-3" />
            <span className="font-semibold">Peak: {peakHour.hour}</span>
          </div>
        )}
      </motion.div>

      {/* Hourly Traffic Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-hover rounded-lg p-5 lg:col-span-1"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hourly Traffic</h3>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={hourlyData}>
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(0 0% 64%)" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "hsl(0 0% 100%)" }}
              itemStyle={{ color: "hsl(25 95% 53%)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {hourlyData.map((entry, i) => (
                <Cell key={i} fill={entry.isPeak ? "hsl(25 95% 53%)" : "hsl(0 0% 25%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recent Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card-hover rounded-lg p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
        </div>
        <div className="space-y-2 max-h-[140px] overflow-y-auto">
          {recentCheckins.length === 0 ? (
            <p className="text-muted-foreground text-sm">No check-ins yet</p>
          ) : (
            recentCheckins.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground font-semibold truncate max-w-[140px]">{c.member_name}</span>
                <span className="text-muted-foreground text-xs">
                  {c.check_in ? format(new Date(c.check_in), "h:mm a") : "—"}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
