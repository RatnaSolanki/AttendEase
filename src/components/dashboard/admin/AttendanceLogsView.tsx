"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MiniCalendar,
  MiniCalendarDay,
  MiniCalendarDays,
  MiniCalendarNavigation,
} from "@/components/ui/shadcn-io/mini-calendar";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardList,
  Download,
  Search,
  Trash2,
  X,
  Settings2,
  CalendarDays,
} from "lucide-react";
import { getAttendanceLogs, verifyAttendance } from "@/lib/firebase/admin";
import { getTodayStats, getAttendanceTrend, getDepartmentStats } from "@/lib/firebase/analytics-service";
import type { TodayStats, AttendanceTrendPoint, DepartmentStats } from "@/lib/firebase/analytics-service";
import { TodayStatsCards } from "./analytics/TodayStatsCard";
import { AttendanceTrendChart } from "./analytics/AttendanceTrendChart";
import { DepartmentChart } from "./analytics/DepartmentChart";
import { toast } from "sonner";
import { AttendanceLog } from "./types";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 25, 50];

export function AttendanceLogsView() {
  const { user, organization } = useAuth();

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [searchFocused, setSearchFocused] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  const [isVerifyingId, setIsVerifyingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Analytics state
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [trendData, setTrendData] = useState<AttendanceTrendPoint[]>([]);
  const [deptData, setDeptData] = useState<DepartmentStats[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, dateFilter, pageSize]);

  const fetchLogs = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const attendanceLogs = await getAttendanceLogs(user.uid);
      setLogs(attendanceLogs || []);
    } catch (err) {
      console.error("Error fetching attendance logs:", err);
      toast.error("Failed to load attendance logs");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const fetchAnalytics = useCallback(async () => {
    if (!organization?.orgID) return;
    
    setAnalyticsLoading(true);
    try {
      const [stats, trend, dept] = await Promise.all([
        getTodayStats(organization.orgID),
        getAttendanceTrend(organization.orgID, 7),
        getDepartmentStats(organization.orgID),
      ]);

      setTodayStats(stats);
      setTrendData(trend);
      setDeptData(dept);
    } catch (error) {
      console.error("Analytics error:", error);
      toast.error("Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [organization?.orgID]);

  useEffect(() => {
    fetchLogs();
    fetchAnalytics();
  }, [fetchLogs, fetchAnalytics]);

  const filteredSortedLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let out = logs.slice();

    if (q) {
      out = out.filter(
        (l) =>
          (l.userName || "").toLowerCase().includes(q) ||
          (l.userId || "").toLowerCase().includes(q) ||
          (l.status || "").toLowerCase().includes(q) ||
          (l.checkInTime || "").toLowerCase().includes(q) ||
          (l.checkOutTime || "").toLowerCase().includes(q),
      );
    }

    if (dateFilter) {
      const filterDateStr = dateFilter.toISOString().split("T")[0];
      out = out.filter((l) => l.date === filterDateStr);
    }

    // Always sort by newest first
    out.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return tb - ta;
    });

    return out;
  }, [logs, searchQuery, dateFilter]);

  const total = filteredSortedLogs.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visibleLogs = filteredSortedLogs.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const exportCSV = async () => {
    if (filteredSortedLogs.length === 0) {
      toast("No rows to export");
      return;
    }

    setIsExporting(true);
    try {
      const rows = filteredSortedLogs;
      const headers = [
        "id",
        "userId",
        "userName",
        "date",
        "checkInTime",
        "checkOutTime",
        "status",
        "verified",
        "location",
      ];
      const csv = [
        "\uFEFF" + headers.join(","),
        ...rows.map((row) =>
          headers
            .map((h) => {
              const v = (row as any)[h];
              if (v == null) return '""';
              if (typeof v === "object")
                return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
              return `"${String(v).replace(/"/g, '""')}"`;
            })
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export started");
    } catch (err) {
      console.error("Export error", err);
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerify = async (logId: string) => {
    const ok = confirm("Mark this attendance as verified?");
    if (!ok) return;

    setIsVerifyingId(logId);
    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, verified: true } : l)),
    );
    try {
      await verifyAttendance(logId);
      toast.success("Attendance verified");
    } catch (err: any) {
      setLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, verified: false } : l)),
      );
      console.error("Verify error", err);
      toast.error(err?.message || "Failed to verify attendance");
    } finally {
      setIsVerifyingId(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter(undefined);
    setPage(1);
  };

  const handleRemove = async (logId: string) => {
    const ok = confirm(
      "Remove this attendance record locally? This does not delete backend data.",
    );
    if (!ok) return;
    setLogs((prev) => prev.filter((l) => l.id !== logId));
    toast.success("Record removed from view");
  };

  const hasActiveFilters = searchQuery || dateFilter;

  return (
    <div className="w-full h-full px-4 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">Attendance Logs</h2>
        <p className="text-sm text-muted-foreground">
          View, filter and verify employee attendance records
        </p>
      </div>

      {/* Analytics Section */}
      {analyticsLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      ) : todayStats ? (
        <div className="space-y-4">
          {/* Today's Stats Cards */}
          <TodayStatsCards stats={todayStats} />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AttendanceTrendChart data={trendData} />
            <DepartmentChart data={deptData} />
          </div>
        </div>
      ) : null}

      {/* Divider */}
      <Separator className="my-6" />

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 pb-4 border-b">
        {/* Search Bar */}
        <div
          className={cn(
            "relative w-full lg:w-80 transition-all duration-200",
            searchFocused || searchQuery
              ? "lg:w-96 ring-2 ring-primary/30 rounded-md"
              : "",
          )}
        >
          <div
            className={cn(
              "relative rounded-md transition-all duration-200",
              searchFocused
                ? "bg-blue-50 dark:bg-blue-950/20"
                : "bg-background",
            )}
          >
            <Search
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200",
                searchFocused || searchQuery
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
            <Input
              placeholder="Search by name, id, status..."
              className={cn(
                "pl-9 pr-9 h-10 border-0 bg-transparent",
                searchFocused && "shadow-sm",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors duration-200",
                  searchFocused
                    ? "text-primary hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mini Calendar */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 justify-start text-left font-normal gap-2 flex-shrink-0",
                dateFilter && "ring-2 ring-primary/30",
              )}
            >
              <CalendarDays
                className={cn("h-4 w-4 shrink-0", dateFilter && "text-primary")}
              />
              <span className="whitespace-nowrap text-sm">
                {dateFilter
                  ? dateFilter.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Filter by Date"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <MiniCalendar onValueChange={setDateFilter} value={dateFilter}>
              <MiniCalendarNavigation direction="prev" />
              <MiniCalendarDays>
                {(date: Date) => (
                  <MiniCalendarDay date={date} key={date.toISOString()} />
                )}
              </MiniCalendarDays>
              <MiniCalendarNavigation direction="next" />
            </MiniCalendar>
            {dateFilter && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-muted-foreground text-sm">
                  Selected:{" "}
                  {dateFilter.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex-1 hidden lg:block" />

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Items per page */}
          <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted/50 border flex-shrink-0">
            <Settings2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Items
            </span>
            <select
              className="bg-transparent text-sm font-semibold cursor-pointer focus:outline-none w-12"
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <Button
            size="sm"
            onClick={clearFilters}
            className={cn(
              "h-9 gap-1.5 transition-all duration-200 bg-red-500 hover:bg-red-600 text-white flex-shrink-0",
              hasActiveFilters
                ? "opacity-100 scale-100"
                : "opacity-40 scale-95 cursor-not-allowed",
            )}
            disabled={!hasActiveFilters}
          >
            <X className="w-4 h-4" />
            <span className="text-sm">Clear</span>
          </Button>

          {/* Export Button */}
          <Button
            size="sm"
            onClick={exportCSV}
            disabled={isExporting || total === 0}
            className={cn(
              "h-9 gap-2 flex-shrink-0 transition-all duration-200",
              "bg-green-600 hover:bg-green-700 text-white",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">
              {isExporting ? "Exporting..." : "Export CSV"}
            </span>
          </Button>
        </div>
      </div>

      {/* Records Card */}
      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Records</h3>
            <Badge variant="secondary" className="font-mono">
              {total}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{page}</span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{pageCount}</span>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : visibleLogs.length > 0 ? (
          <div className="space-y-0">
            {visibleLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2.5 rounded-md hover:bg-accent/50 transition-colors border-b last:border-0"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status Icon */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      log.status === "present"
                        ? "bg-green-100 dark:bg-green-900"
                        : log.status === "late"
                          ? "bg-amber-100 dark:bg-amber-900"
                          : "bg-red-100 dark:bg-red-900",
                    )}
                  >
                    {log.status === "present" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">
                        {log.userName}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        • {log.userId}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.checkInTime || "—"}
                        {log.checkOutTime ? ` → ${log.checkOutTime}` : ""}
                      </span>

                      {log.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {typeof log.location === "string"
                            ? log.location
                            : `${(log.location as any).latitude?.toFixed?.(4) ?? ""}, ${(log.location as any).longitude?.toFixed?.(4) ?? ""}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <Badge
                    variant={
                      log.status === "present"
                        ? "default"
                        : log.status === "late"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {log.status
                      ? `${log.status.charAt(0).toUpperCase()}${log.status.slice(1)}`
                      : "Unknown"}
                  </Badge>

                  {!log.verified ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(log.id)}
                      disabled={isVerifyingId === log.id}
                      className="h-8"
                    >
                      {isVerifyingId === log.id ? "Verifying..." : "Verify"}
                    </Button>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      ✓ Verified
                    </Badge>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(log.id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-1">
              No attendance logs found
            </p>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try different filters"
                : "Logs will appear here once employees check in"}
            </p>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {visibleLogs.length}
            </span>{" "}
            of <span className="font-semibold text-foreground">{total}</span>{" "}
            records
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <div className="px-3 py-1 text-sm font-semibold bg-primary/10 text-primary rounded-md min-w-10 text-center">
              {page}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}