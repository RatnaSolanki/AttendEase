"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from "lucide-react";
import {
  getOrganizationEmployees,
  getTodayAttendanceSummary,
  getOrganizationData,
} from "@/lib/firebase/admin";
import { DashboardStats } from "./types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const formatMinutesToHours = (
  mins: number | null | undefined,
): string | null => {
  if (mins == null || Number.isNaN(mins)) return null;
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m}m`;
};

const formatMinutesCompact = (
  mins: number | null | undefined,
): string | null => {
  if (mins == null || Number.isNaN(mins)) return null;
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}m`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}m`;
};

interface DashboardViewProps {
  onLogout?: () => void;
}

export function DashboardView({ onLogout }: DashboardViewProps) {
  const { user, logout } = useAuth();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orgShiftMinutes, setOrgShiftMinutes] = useState<number>(9 * 60);
  const [logoutPopoverOpen, setLogoutPopoverOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const toDateFromAny = (v: any): Date | null => {
    if (v == null) return null;
    if (typeof v === "object" && typeof v.toDate === "function") {
      const d = v.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === "number") {
      const ms = v > 1e12 ? v : v * 1000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v === "string") {
      const iso = new Date(v);
      if (!isNaN(iso.getTime())) return iso;
    }
    return null;
  };

  const parseTimeOnLocalDate = (
    anchorDate: Date,
    timeStr: string,
  ): Date | null => {
    if (!anchorDate || !timeStr) return null;
    const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
    if (!m) return null;
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ampm = m[3] ? m[3].toLowerCase() : null;
    if (ampm) {
      if (ampm === "pm" && hh < 12) hh += 12;
      if (ampm === "am" && hh === 12) hh = 0;
    }
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const day = anchorDate.getDate();
    const d = new Date(year, month, day, hh, mm, 0);
    return isNaN(d.getTime()) ? null : d;
  };

  const load = async () => {
    if (!user?.uid) return;
    try {
      setRefreshing(true);
      const [orgData, employees, summary] = await Promise.all([
        getOrganizationData(user.uid).catch(() => null),
        getOrganizationEmployees(user.uid).catch(() => []),
        getTodayAttendanceSummary(user.uid).catch(() => ({
          present: 0,
          absent: 0,
          late: 0,
          recentActivity: [],
        })),
      ]);

      setOrgName(orgData?.name || "Organization Dashboard");

      const orgAny = orgData as any;
      const shiftFromOrg =
        typeof orgAny?.shiftMinutes === "number"
          ? orgAny.shiftMinutes
          : typeof orgAny?.settings?.shiftMinutes === "number"
            ? orgAny.settings.shiftMinutes
            : undefined;
      const shiftMin = typeof shiftFromOrg === "number" ? shiftFromOrg : 9 * 60;
      setOrgShiftMinutes(shiftMin);

      const total = (employees || []).length;
      const present = summary.present || 0;
      const absent = summary.absent ?? Math.max(0, total - present);
      const late = summary.late || 0;
      const attendanceRate =
        total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({
        totalEmployees: total,
        presentToday: present,
        absentToday: absent,
        lateToday: late,
        attendanceRate,
      });

      const mapped = (summary.recentActivity || []).map((a: any) => {
        const checkInISO =
          a.checkInISO ??
          a.checkInTimestamp ??
          a.checkInAt ??
          a.checkInTimeISO ??
          a.check_in_iso ??
          a.check_in_timestamp ??
          a.check_in_at ??
          a.timestamp ??
          null;

        const checkOutISO =
          a.checkOutISO ??
          a.checkOutTimestamp ??
          a.checkOutAt ??
          a.checkOutTimeISO ??
          a.check_out_iso ??
          a.check_out_timestamp ??
          a.check_out_at ??
          a.checkout ??
          a.checkoutAt ??
          a.checkoutTimestamp ??
          null;

        const checkInTime =
          a.checkInTime ??
          a.checkInFormatted ??
          a.checkIn ??
          a.check_in_time ??
          null;
        const checkOutTime =
          a.checkOutTime ??
          a.checkOutFormatted ??
          a.checkOut ??
          a.check_out_time ??
          null;

        const explicitFlag =
          a.checkedOut === true ||
          a.isCheckedOut === true ||
          a.hasCheckedOut === true ||
          false;

        const altCheckout =
          a.checkout ??
          a.check_out ??
          a.checked_out_at ??
          a.checkoutTimestamp ??
          a.checkout_ts ??
          null;

        const isCheckedOut =
          Boolean(checkOutISO) ||
          (typeof checkOutTime === "string" && checkOutTime.trim() !== "") ||
          explicitFlag ||
          (altCheckout !== null && altCheckout !== undefined);

        const start =
          toDateFromAny(checkInISO) ?? toDateFromAny(a.timestamp) ?? null;
        let end = toDateFromAny(checkOutISO);

        if (!end && checkOutTime && start) {
          const parsed = parseTimeOnLocalDate(start, checkOutTime);
          if (parsed) end = parsed;
        }

        if (!end && altCheckout) {
          const tryAlt = toDateFromAny(altCheckout);
          if (tryAlt) end = tryAlt;
        }

        if (start && end && end.getTime() < start.getTime()) {
          const diffMs = end.getTime() - start.getTime();
          if (diffMs > -1000 * 60 * 60 * 18) {
            end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
          }
        }

        let workedMinutes: number | null = null;
        if (start && end) {
          const sT = start.getTime();
          const eT = end.getTime();
          if (!isNaN(sT) && !isNaN(eT) && eT >= sT) {
            workedMinutes = Math.round((eT - sT) / (1000 * 60));
          } else {
            workedMinutes = null;
          }
        }

        const diffMinutes =
          typeof workedMinutes === "number" ? workedMinutes - shiftMin : null;

        return {
          ...a,
          checkInISO,
          checkOutISO,
          checkInTime,
          checkOutTime,
          isCheckedOut,
          workedMinutes,
          diffMinutes,
          shiftMinutes: shiftMin,
        };
      });

      setRecentActivity(mapped);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      if (onLogout && typeof onLogout === "function") {
        await onLogout();
      } else if (logout && typeof logout === "function") {
        await logout();
      }

      toast.success("Logged out successfully");
      setLogoutPopoverOpen(false);
    } catch (err: any) {
      console.error("Logout error:", err);
      toast.error(err?.message || "Failed to logout");
    } finally {
      setLoggingOut(false);
    }
  };

  const StatCard = ({
    title,
    value,
    subtitle,
    color,
    icon,
    extra,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    icon?: React.ReactNode;
    extra?: React.ReactNode;
  }) => (
    <Card
      className="p-4 sm:p-5 hover:shadow-lg transition-all duration-200 border-l-4"
      style={{
        borderLeftColor: color?.includes("blue")
          ? "#3b82f6"
          : color?.includes("green")
            ? "#22c55e"
            : color?.includes("red")
              ? "#ef4444"
              : "#a855f7",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              {value}
            </h3>
            {extra}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-2 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center ${color} shadow-md flex-shrink-0`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header with Logout - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 shadow-sm border">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              {orgName || "Dashboard"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Real-time attendance monitoring
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={refreshing}
              className="flex items-center gap-2 hover:bg-gray-100 h-9"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Popover
              open={logoutPopoverOpen}
              onOpenChange={setLogoutPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2 h-9"
                  disabled={loggingOut}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-b-2 border-red-200 dark:border-red-800 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-900 dark:text-red-100 mb-1">
                        Sign Out?
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        You'll need to sign in again to access the dashboard.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <Button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    {loggingOut ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-2" />
                        Yes, Sign Out
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setLogoutPopoverOpen(false)}
                    disabled={loggingOut}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {loading ? (
            <>
              <Skeleton className="h-32 sm:h-36 rounded-xl" />
              <Skeleton className="h-32 sm:h-36 rounded-xl" />
              <Skeleton className="h-32 sm:h-36 rounded-xl" />
              <Skeleton className="h-32 sm:h-36 rounded-xl" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Employees"
                value={stats.totalEmployees}
                subtitle={`Shift: ${Math.floor(orgShiftMinutes / 60)}h ${orgShiftMinutes % 60}m`}
                color="bg-blue-100"
                icon={<Users className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />}
              />

              <StatCard
                title="Present Today"
                value={stats.presentToday}
                subtitle="Currently Checked In"
                color="bg-green-100"
                icon={
                  <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                }
              />

              <StatCard
                title="Absent Today"
                value={stats.absentToday}
                subtitle="Not Checked In Yet"
                color="bg-red-100"
                icon={<UserX className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />}
              />

              <Card className="p-4 sm:p-5 hover:shadow-lg transition-all duration-200 border-l-4 border-l-purple-500">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-2">
                      Attendance Rate
                    </p>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                      {stats.attendanceRate}%
                    </h3>

                    <div className="mt-3 sm:mt-4">
                      <Progress
                        value={stats.attendanceRate}
                        className="h-2 sm:h-2.5 bg-gray-200"
                      />
                      <div className="flex items-center gap-2 sm:gap-4 text-xs font-medium text-gray-600 mt-2 sm:mt-2.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {stats.presentToday}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          {stats.absentToday}
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          {stats.lateToday}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
                    <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Recent Activity & Insights - Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <Card className="p-4 sm:p-6 lg:col-span-2 shadow-sm">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Recent Check-ins
              </h3>
              <span className="text-xs sm:text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full whitespace-nowrap">
                {recentActivity.length} Active
              </span>
            </div>

            <Separator className="mb-4 sm:mb-5" />

            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                <Skeleton className="h-20 sm:h-24 rounded-xl" />
                <Skeleton className="h-20 sm:h-24 rounded-xl" />
                <Skeleton className="h-20 sm:h-24 rounded-xl" />
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => {
                  const workedStr = formatMinutesToHours(
                    activity.workedMinutes,
                  );
                  const diffStr = formatMinutesCompact(activity.diffMinutes);
                  const statusTag = activity.isCheckedOut ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm whitespace-nowrap">
                      <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Completed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm whitespace-nowrap">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">Active</span>
                    </span>
                  );

                  return (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all bg-white"
                    >
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-gray-100 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg">
                          {activity.userName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                          <span className="text-sm sm:text-base font-bold text-gray-900 truncate">
                            {activity.userName}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-400 hidden sm:inline">
                            •
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 truncate">
                            {activity.userEmail}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium text-gray-700">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                            <span>{activity.checkInTime ?? "—"}</span>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium text-gray-700">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
                            <span>{activity.checkOutTime ?? "Pending"}</span>
                          </div>

                          {workedStr && (
                            <span className="font-bold text-xs sm:text-sm text-indigo-700 bg-indigo-50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg whitespace-nowrap">
                              {workedStr}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                            Shift:{" "}
                            {Math.floor(
                              (activity.shiftMinutes ?? orgShiftMinutes) / 60,
                            )}
                            h {(activity.shiftMinutes ?? orgShiftMinutes) % 60}m
                          </span>

                          {diffStr && (
                            <span
                              className={`text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg flex items-center gap-1 whitespace-nowrap ${
                                activity.diffMinutes! >= 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {activity.diffMinutes! >= 0 ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {diffStr}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:block justify-end">
                        {statusTag}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-xl">
                <Clock className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-base sm:text-lg font-semibold text-gray-600">
                  No check-ins yet today
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">
                  Employee activity will appear here
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
              Quick Insights
            </h4>

            <Separator className="mb-4 sm:mb-5" />

            {loading ? (
              <div className="space-y-3 sm:space-y-4">
                <Skeleton className="h-14 sm:h-16 rounded-xl" />
                <Skeleton className="h-14 sm:h-16 rounded-xl" />
                <Skeleton className="h-14 sm:h-16 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        Active Employees
                      </div>
                      <div className="text-xs text-gray-600">
                        Total workforce
                      </div>
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-700 flex-shrink-0">
                    {stats.totalEmployees}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-gray-900">
                        Present
                      </div>
                      <div className="text-xs text-gray-600">
                        Checked in today
                      </div>
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-700 flex-shrink-0">
                    {stats.presentToday}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-red-50 to-red-100 border border-red-200">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <UserX className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-gray-900">
                        Absent
                      </div>
                      <div className="text-xs text-gray-600">
                        Not checked in
                      </div>
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-red-700 flex-shrink-0">
                    {stats.absentToday}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
