"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  X,
  Settings2,
  Calendar as CalendarIcon,
  List,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  RefreshCw,
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
import AttendanceCalendar from "./AttendanceCalendar";

const PAGE_SIZES = [8, 20, 50];

export default function HistoryContent() {
  const { user } = useAuth();

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
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
        const searchableText = `${r.checkInTime ?? ""} ${r.checkOutTime ?? ""} ${r.status ?? ""}`.toLowerCase();
        return dateLabel.includes(q) || searchableText.includes(q);
      });
    }

    if (dateFilter) {
      const filterDateStr = dateFilter.toISOString().split("T")[0];
      list = list.filter((r: AttendanceRecord) => {
        if (!r.date) return false;
        return String(r.date) === filterDateStr;
      });
    }

    // Sort by date descending
    list.sort((a: AttendanceRecord, b: AttendanceRecord) => {
      const aTs = a.timestamp?.toDate?.()?.getTime?.() ?? (a.date ? new Date(a.date).getTime() : 0);
      const bTs = b.timestamp?.toDate?.()?.getTime?.() ?? (b.date ? new Date(b.date).getTime() : 0);
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
      toast.info("No records to export");
      return;
    }
    const headers = [
      "Date",
      "Check In",
      "Check Out",
      "Status",
      "Worked Minutes",
      "Location Verified",
      "Distance From Office (m)",
      "Latitude",
      "Longitude",
    ];
    const rows = filtered.map((r: AttendanceRecord) => {
      const lat = (r as any).location?.latitude ?? (r as any).coordinates?.lat ?? (r as any).latitude;
      const lon = (r as any).location?.longitude ?? (r as any).coordinates?.long ?? (r as any).longitude;
      const latStr = typeof lat === "number" ? lat.toFixed(6) : "";
      const lonStr = typeof lon === "number" ? lon.toFixed(6) : "";
      const distance = r.distanceFromOffice ? String(r.distanceFromOffice) : "";
      const verified = r.locationVerified ? "Yes" : "No";
      const workedMins = r.workedMinutes ? String(r.workedMinutes) : "";
      
      return [
        r.date ?? "",
        r.checkInTime ?? "",
        r.checkOutTime ?? "",
        r.status ?? "",
        workedMins,
        verified,
        distance,
        latStr,
        lonStr,
      ];
    });

    const csv = "\uFEFF" + [
      headers.join(","),
      ...rows.map((r: string[]) =>
        r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFilter(undefined);
    setPage(1);
  };

  const hasActiveFilters = searchQuery || dateFilter;

  // Calculate stats
  const stats = useMemo(() => {
    const present = attendanceHistory.filter(r => r.status === "present").length;
    const absent = attendanceHistory.filter(r => r.status === "absent").length;
    const late = attendanceHistory.filter(r => r.status === "late").length;
    const totalMinutes = attendanceHistory.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    
    return { present, absent, late, totalHours };
  }, [attendanceHistory]);

  return (
    <SidebarInset>
      {/* Header - Improved */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <SidebarTrigger />
        <div className="mx-2 h-6 w-px bg-border" aria-hidden="true" />
        <div className="flex-1 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Attendance History</h1>
            <p className="text-xs text-muted-foreground">
              Track your attendance records and export data
            </p>
          </div>

          
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={loading || total === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="w-full h-full px-4 py-6 space-y-6">
          {/* Page Title */}
          <div>
            <h2 className="text-2xl font-bold mb-1">Your Attendance</h2>
            <p className="text-sm text-muted-foreground">
              View your attendance in calendar or list format
            </p>
          </div>

          {/* Tabs for Calendar vs List View */}
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                <span>List</span>
              </TabsTrigger>
            </TabsList>

           
            <TabsContent value="calendar" className="mt-6">
              <AttendanceCalendar />
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="mt-6 space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 pb-4 border-b">
                {/* Search bar */}
                <div
                  className={cn(
                    "relative w-full lg:w-80 transition-all duration-200",
                    searchFocused || searchQuery ? "lg:w-96" : ""
                  )}
                >
                  <div className="relative">
                    <Search
                      className={cn(
                        "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200",
                        searchFocused || searchQuery ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <Input
                      placeholder="Search by date, time, or status..."
                      className={cn(
                        "pl-9 pr-9 h-10",
                        searchFocused && "ring-2 ring-primary/20"
                      )}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-accent transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Spacer */}
                <div className="hidden lg:block flex-1" />

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Date filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-9 px-3 justify-start gap-2",
                          dateFilter && "border-primary text-primary"
                        )}
                      >
                        <CalendarDays className="h-4 w-4" />
                        <span className="text-sm">
                          {dateFilter
                            ? dateFilter.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Filter Date"}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDateFilter(undefined)}
                            className="w-full"
                          >
                            Clear Date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>

                  {/* Page size */}
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted/50 border">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="bg-transparent text-sm font-semibold cursor-pointer focus:outline-none"
                    >
                      {PAGE_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleClearFilters}
                      className="h-9 px-3 gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Records Card */}
              <div className="bg-card rounded-lg border shadow-sm">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">Records</h3>
                    <Badge variant="secondary">{total}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Page <span className="font-semibold">{page}</span> of{" "}
                    <span className="font-semibold">{pageCount}</span>
                  </div>
                </div>

                <div className="p-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                      ))}
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                      <p className="text-destructive font-semibold mb-2">
                        Failed to load attendance history
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">{error}</p>
                      <Button onClick={fetchHistory} variant="outline" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                      </Button>
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground font-semibold mb-2">
                        No attendance records found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hasActiveFilters
                          ? "Try adjusting your filters"
                          : "Check in from the dashboard to create your first record"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visible.map((record: AttendanceRecord) => {
                        const isPresent = record.status === "present";
                        const lat = (record as any).location?.latitude ?? (record as any).coordinates?.lat ?? (record as any).latitude;
                        const lon = (record as any).location?.longitude ?? (record as any).coordinates?.long ?? (record as any).longitude;
                        const displayDate = record.date
                          ? (() => {
                              try {
                                return new Date(record.date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                });
                              } catch {
                                return String(record.date);
                              }
                            })()
                          : "Unknown date";

                        return (
                          <div
                            key={record.id}
                            className="flex items-start justify-between p-4 rounded-lg hover:bg-accent/50 transition-colors border"
                          >
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                              {/* Status Icon */}
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                  isPresent
                                    ? "bg-emerald-50 dark:bg-emerald-950/30"
                                    : "bg-rose-50 dark:bg-rose-950/30"
                                )}
                              >
                                {isPresent ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                )}
                              </div>

                              {/* Record Details */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="text-sm font-semibold">{displayDate}</div>
                                  <Badge variant="outline" className="text-xs">
                                    {record.status?.toUpperCase()}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>In: {record.checkInTime || "—"}</span>
                                  </div>
                                  {record.checkOutTime && record.checkOutTime !== "—" && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>Out: {record.checkOutTime}</span>
                                    </div>
                                  )}
                                  {record.workedMinutes && (
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3" />
                                      <span>{Math.floor(record.workedMinutes / 60)}h {record.workedMinutes % 60}m</span>
                                    </div>
                                  )}
                                </div>

                                {(typeof lat === "number" && typeof lon === "number") && (
                                  <div className="flex items-start gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span>
                                      {lat.toFixed(4)}, {lon.toFixed(4)}
                                      {record.distanceFromOffice !== undefined && (
                                        <> • {record.distanceFromOffice}m</>
                                      )}
                                      {record.locationVerified !== undefined && (
                                        <>
                                          {" • "}
                                          {record.locationVerified ? (
                                            <span className="text-emerald-600">✓ Verified</span>
                                          ) : (
                                            <span className="text-amber-600">⚠ Outside</span>
                                          )}
                                        </>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {!loading && !error && visible.length > 0 && (
                  <div className="px-4 py-3 border-t flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold">{visible.length}</span> of{" "}
                      <span className="font-semibold">{total}</span> records
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      >
                        Previous
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
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SidebarInset>
  );
}