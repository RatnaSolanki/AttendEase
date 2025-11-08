"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  X,
  Settings2,
} from "lucide-react";
import {
  getAttendanceHistory,
  type AttendanceRecord,
} from "@/lib/firebase/attendance";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
import { cn } from "@/lib/utils";

const PAGE_SIZES = [8, 20, 50];

export default function HistoryContent() {
  const { user } = useAuth();

  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const history = await getAttendanceHistory(user.uid);
      setAttendanceHistory(Array.isArray(history) ? history : []);
      setPage(1);
    } catch (err: any) {
      console.error("Error fetching attendance history:", err);
      setError(err?.message || "Failed to load attendance history");
      toast.error("Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = attendanceHistory.slice();

    if (q) {
      list = list.filter((r: AttendanceRecord) => {
        const dateLabel = (r.date ?? "").toLowerCase();
        const nameOrNote =
          `${r.checkInTime ?? ""} ${r.checkOutTime ?? ""} ${r.status ?? ""}`.toLowerCase();
        return dateLabel.includes(q) || nameOrNote.includes(q);
      });
    }

    if (dateFilter) {
      const filterDateStr = dateFilter.toISOString().split("T")[0];
      list = list.filter((r: AttendanceRecord) => {
        if (!r.date) return false;
        return String(r.date) === filterDateStr;
      });
    }

    list.sort((a: AttendanceRecord, b: AttendanceRecord) => {
      const aTs =
        a.timestamp?.toDate?.()?.getTime?.() ??
        (a.date ? new Date(a.date).getTime() : 0);
      const bTs =
        b.timestamp?.toDate?.()?.getTime?.() ??
        (b.date ? new Date(b.date).getTime() : 0);
      return bTs - aTs;
    });

    return list;
  }, [attendanceHistory, searchQuery, dateFilter]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [pageCount, page]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast("No records to export");
      return;
    }
    const headers = [
      "Date",
      "CheckIn",
      "CheckOut",
      "Status",
      "Latitude",
      "Longitude",
      "Notes",
    ];
    const rows = filtered.map((r: AttendanceRecord) => {
      const lat =
        (r as any).location?.latitude ??
        (r as any).coordinates?.lat ??
        (r as any).latitude;
      const lon =
        (r as any).location?.longitude ??
        (r as any).coordinates?.long ??
        (r as any).longitude;
      const latStr = typeof lat === "number" ? lat.toFixed(6) : "";
      const lonStr = typeof lon === "number" ? lon.toFixed(6) : "";
      const note = (r as any).note || "";
      return [
        r.date ?? "",
        r.checkInTime ?? "",
        r.checkOutTime ?? "",
        r.status ?? "",
        latStr,
        lonStr,
        note,
      ];
    });

    const csv =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((r: string[]) =>
          r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Export started");
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFilter(undefined);
    setPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || dateFilter;

  return (
    <SidebarInset>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <div className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
        <div className="flex-1 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Attendance History</h1>
            <p className="text-xs text-muted-foreground">
              View your past check-ins and export records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={loading || total === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main className="flex-1 overflow-auto">
        <div className="w-full h-full px-4 py-6 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-0.5">Your Attendance</h2>
            <p className="text-sm text-muted-foreground">
              A chronological history of your check-ins
            </p>
          </div>

          {/* Toolbar - Responsive Layout */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 pb-4 border-b">
            {/* Search bar - full width on mobile, constrained on desktop */}
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
                  placeholder="Search date, times or status"
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

            {/* Spacer for desktop to push controls to the right */}
            <div className="hidden lg:block flex-1" />

            {/* Date, Items, and Clear - row on mobile, grouped on desktop */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mini calendar */}
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
                      className={cn(
                        "h-4 w-4 shrink-0",
                        dateFilter && "text-primary",
                      )}
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
                  <MiniCalendar
                    onValueChange={setDateFilter}
                    value={dateFilter}
                  >
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

              {/* Rows per page */}
              <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted/50 border border-border/50 flex-shrink-0">
                <Settings2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Items
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-transparent text-sm font-semibold cursor-pointer focus:outline-none w-12"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters button */}
              <Button
                size="sm"
                onClick={handleClearFilters}
                className={cn(
                  "h-9 px-3 gap-1.5 transition-all duration-200 bg-red-500 hover:bg-red-600 text-white flex-shrink-0",
                  hasActiveFilters
                    ? "opacity-100 scale-100"
                    : "opacity-40 scale-95 cursor-not-allowed",
                )}
                disabled={!hasActiveFilters}
              >
                <X className="w-4 h-4" />
                <span className="text-sm">Clear</span>
              </Button>
            </div>
          </div>

          {/* Records card - Full Width */}
          <div className="bg-card rounded-lg border shadow-sm">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Records</h3>
                <Badge variant="secondary" className="font-mono">
                  {total}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Page{" "}
                <span className="font-semibold text-foreground">{page}</span> of{" "}
                <span className="font-semibold text-foreground">
                  {pageCount}
                </span>
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-md" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No attendance records found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check in from the dashboard to create your first record
                  </p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  <p className="mb-2">Failed to load attendance history</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button onClick={fetchHistory} className="mt-4">
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {visible.map((record: AttendanceRecord) => {
                    const isPresent = record.status === "present";
                    const lat =
                      (record as any).location?.latitude ??
                      (record as any).coordinates?.lat ??
                      (record as any).latitude;
                    const lon =
                      (record as any).location?.longitude ??
                      (record as any).coordinates?.long ??
                      (record as any).longitude;
                    const displayDate = record.date
                      ? (() => {
                          try {
                            return new Date(record.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            );
                          } catch {
                            return String(record.date);
                          }
                        })()
                      : "Unknown date";

                    return (
                      <div
                        key={record.id}
                        className="flex items-start justify-between py-3 px-2 rounded-md hover:bg-accent/50 transition-colors border-b last:border-0"
                      >
                        <div className="flex items-start gap-4 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isPresent
                                ? "bg-green-100 dark:bg-green-900"
                                : "bg-red-100 dark:bg-red-900"
                            }`}
                          >
                            {isPresent ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-3 mb-1">
                              <div className="text-sm font-semibold">
                                {displayDate}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                • {record.status?.toUpperCase()}
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground mb-1">
                              <span className="font-medium">Check-in:</span>{" "}
                              {record.checkInTime}
                              {record.checkOutTime &&
                                record.checkOutTime !== "—" && (
                                  <>
                                    {" • "}
                                    <span className="font-medium">
                                      Check-out:
                                    </span>{" "}
                                    {record.checkOutTime}
                                  </>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground">
                              {typeof lat === "number" &&
                              typeof lon === "number" ? (
                                <>
                                  📍 {lat.toFixed(6)}, {lon.toFixed(6)}
                                </>
                              ) : (
                                <span>Location not recorded</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant={isPresent ? "default" : "destructive"}
                          className="ml-4 self-start flex-shrink-0"
                        >
                          {record.status
                            ? `${record.status.charAt(0).toUpperCase()}${record.status.slice(1)}`
                            : "Unknown"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {visible.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">{total}</span>{" "}
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
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}
