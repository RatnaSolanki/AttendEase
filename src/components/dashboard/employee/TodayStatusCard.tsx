"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { type AttendanceRecord } from "@/lib/firebase/attendance";

interface TodayStatusCardProps {
  todayAttendance: AttendanceRecord | null;
  expectedShiftMinutes?: number;
}

function timeStringToDate(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return null;
  const hasAmPm = /am|pm/i.test(timeStr);
  if (hasAmPm) {
    const parsed = new Date(`${dateStr} ${timeStr}`);
    if (!isNaN(parsed.getTime())) return parsed;
  } else {
    const [hhmm] = timeStr.split(" ");
    const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      const d = new Date(dateStr);
      d.setHours(hh, mm, 0, 0);
      return d;
    }
  }
  const parsed = new Date(`${dateStr}T${timeStr}`);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default function TodayStatusCard({
  todayAttendance,
  expectedShiftMinutes = 8 * 60,
}: TodayStatusCardProps) {
  const checkedIn = !!todayAttendance && !!todayAttendance.checkInTime;
  const checkedOut = !!todayAttendance && !!todayAttendance.checkOutTime;

  let workedMinutes: number | null = null;
  let diffMinutes: number | null = null;
  let overtime = 0;
  let undertime = 0;

  if (checkedIn && todayAttendance) {
    const start = timeStringToDate(
      todayAttendance.date || new Date().toISOString().split("T")[0],
      todayAttendance.checkInTime || "",
    );
    const end = checkedOut
      ? timeStringToDate(
          todayAttendance.date || new Date().toISOString().split("T")[0],
          todayAttendance.checkOutTime || "",
        )
      : new Date();
    if (start && end) {
      workedMinutes = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60),
      );
      diffMinutes = workedMinutes - expectedShiftMinutes;
      if (diffMinutes > 0) overtime = diffMinutes;
      else undertime = -diffMinutes;
    }
  }

  const formatMinutes = (mins: number | null) => {
    if (mins == null) return "—";
    const h = Math.floor(mins / 60);
    const m = Math.abs(mins % 60);
    return `${h}h ${m}m`;
  };

  const colorClass =
    overtime > 0
      ? "text-green-700 bg-green-100"
      : undertime > 0
        ? "text-red-700 bg-red-100"
        : "text-gray-700 bg-gray-100";

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-sm mb-0.5">Today's Status</h3>
          <p className="text-gray-600 text-xs">
            {checkedIn
              ? checkedOut
                ? `Checked in at ${todayAttendance?.checkInTime}, checked out at ${todayAttendance?.checkOutTime}`
                : `Checked in at ${todayAttendance?.checkInTime} — still active`
              : "Not checked in yet"}
          </p>
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${checkedIn ? "bg-green-100" : "bg-orange-100"}`}
        >
          <Calendar
            className={`w-5 h-5 ${checkedIn ? "text-green-600" : "text-orange-600"}`}
          />
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Worked</div>
          <div className="text-sm font-medium">
            {formatMinutes(workedMinutes)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Expected shift</div>
          <div className="text-sm font-medium">
            {formatMinutes(expectedShiftMinutes)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Difference</div>
          <div
            className={`text-sm font-medium px-2 py-0.5 rounded-full ${colorClass}`}
          >
            {diffMinutes == null
              ? "—"
              : diffMinutes > 0
                ? `+${formatMinutes(diffMinutes)}`
                : `-${formatMinutes(Math.abs(diffMinutes))}`}
          </div>
        </div>

        <div className="mt-2">
          <Badge
            variant={checkedIn ? "default" : "outline"}
            className="text-xs"
          >
            {checkedIn ? (checkedOut ? "Present" : "Active") : "Pending"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
