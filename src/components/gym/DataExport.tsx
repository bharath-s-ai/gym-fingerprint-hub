import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, subDays } from "date-fns";

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataExport() {
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exportingMembers, setExportingMembers] = useState(false);
  const [exportingAttendance, setExportingAttendance] = useState(false);

  const exportMembers = async () => {
    setExportingMembers(true);
    const { data } = await supabase.from("members").select("name, phone, email, joining_date, expiry_date, active").order("name");
    if (data) {
      const header = "Name,Phone,Email,Joining Date,Expiry Date,Active\n";
      const rows = data.map((m) => `"${m.name}","${m.phone}","${m.email || ""}","${m.joining_date || ""}","${m.expiry_date}","${m.active}"`).join("\n");
      downloadCSV(`f2f-members-${format(new Date(), "yyyy-MM-dd")}.csv`, header + rows);
    }
    setExportingMembers(false);
  };

  const exportAttendance = async () => {
    setExportingAttendance(true);
    const { data: attendance } = await supabase
      .from("attendance")
      .select("check_in, member_id")
      .gte("check_in", `${fromDate}T00:00:00`)
      .lte("check_in", `${toDate}T23:59:59`)
      .order("check_in", { ascending: false });

    if (attendance && attendance.length > 0) {
      const memberIds = [...new Set(attendance.map((a) => a.member_id))];
      const { data: members } = await supabase.from("members").select("id, name, phone").in("id", memberIds);
      const nameMap = new Map((members || []).map((m) => [m.id, m]));

      const header = "Member Name,Phone,Check In\n";
      const rows = attendance
        .map((a) => {
          const member = nameMap.get(a.member_id);
          return `"${member?.name || "Unknown"}","${member?.phone || ""}","${a.check_in || ""}"`;
        })
        .join("\n");
      downloadCSV(`f2f-attendance-${fromDate}-to-${toDate}.csv`, header + rows);
    }
    setExportingAttendance(false);
  };

  return (
    <div className="glass-card rounded-lg p-5 space-y-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        Data Export
      </h3>

      <Button
        onClick={exportMembers}
        disabled={exportingMembers}
        variant="outline"
        className="w-full border-primary/30 text-primary hover:bg-primary/10 font-semibold uppercase tracking-wider min-h-[48px]"
      >
        <Download className="w-4 h-4 mr-2" />
        {exportingMembers ? "Exporting..." : "Export Members CSV"}
      </Button>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-muted/50 border-border h-10 flex-1 text-sm"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-muted/50 border-border h-10 flex-1 text-sm"
          />
        </div>
        <Button
          onClick={exportAttendance}
          disabled={exportingAttendance}
          variant="outline"
          className="w-full border-primary/30 text-primary hover:bg-primary/10 font-semibold uppercase tracking-wider min-h-[48px]"
        >
          <Download className="w-4 h-4 mr-2" />
          {exportingAttendance ? "Exporting..." : "Export Attendance CSV"}
        </Button>
      </div>
    </div>
  );
}
