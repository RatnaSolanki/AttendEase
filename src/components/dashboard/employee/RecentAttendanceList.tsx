"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";
import { type AttendanceRecord } from "@/lib/firebase/attendance";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface RecentAttendanceListProps {
  attendanceHistory: AttendanceRecord[];
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export default function RecentAttendanceList({
  attendanceHistory,
  showViewAll = false,
  onViewAll,
}: RecentAttendanceListProps) {
  const displayRecords = showViewAll
    ? attendanceHistory.slice(0, 5)
    : attendanceHistory;

  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return "Unknown date";
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      const alt = Date.parse(dateStr);
      if (isNaN(alt)) return "Unknown date";
      return format(new Date(alt), "MMM d, yyyy");
    }
    return format(parsed, "MMM d, yyyy");
  };

  const statusToVariant = (status?: string) => {
    if (!status) return "outline";
    return status === "present" ? "default" : "destructive";
  };

  const statusLabel = (status?: string) => {
    const s = status ?? "unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <Card className="p-4">
      {/* Header - minimal bottom margin */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-lg">Recent Attendance</h3>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        )}
      </div>

      {/* Separator - minimal top and bottom margin */}
      <Separator className="my-2" />

      {/* Content */}
      {displayRecords.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No attendance records yet</p>
          <p className="text-sm text-gray-500">
            Mark your first attendance to get started
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {displayRecords.map((record) => {
            const dateLabel = formatDateSafe(record.date);
            const checkIn = record.checkInTime ?? "—";
            const checkOut = record.checkOutTime
              ? ` - ${record.checkOutTime}`
              : "";
            const status = record.status ?? "unknown";
            const key =
              record.id ??
              `${record.userId ?? "u"}-${record.date ?? Math.random()}`;

            return (
              <div
                key={key}
                className="flex items-center justify-between py-2.5 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      status === "present"
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-red-100 dark:bg-red-900"
                    }`}
                  >
                    {status === "present" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {dateLabel}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {checkIn}
                      {checkOut}
                    </div>
                  </div>
                </div>

                <Badge
                  variant={statusToVariant(status)}
                  className="flex-shrink-0 ml-2"
                >
                  {statusLabel(status)}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
