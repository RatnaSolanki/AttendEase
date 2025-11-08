"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import MarkAttendanceCard from "./MarkAttendanceCard";
import TodayStatusCard from "./TodayStatusCard";
import MonthlyStatsGrid from "./MonthlyStatsGrid";
import RecentAttendanceList from "./RecentAttendanceList";
import LocationDialog from "./LocationDialog";

import {
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceStats,
  type AttendanceRecord,
} from "@/lib/firebase/attendance";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DashboardContent() {
  const { user, organization, logout } = useAuth();

  const [todayAttendance, setTodayAttendance] =
    useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);
  const [stats, setStats] = useState({
    daysPresent: 0,
    totalWorkingDays: 0,
    attendanceRate: 0,
  });

  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationAction, setLocationAction] = useState<"checkin" | "checkout">(
    "checkin",
  );
  const [locationAttendanceDocId, setLocationAttendanceDocId] = useState<
    string | null
  >(null);

  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "verifying" | "success" | "error"
  >("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const expectedShiftMinutes =
    (organization as any)?.shiftMinutes ??
    (organization as any)?.settings?.shiftMinutes ??
    9 * 60;

  const loadAttendanceData = useCallback(
    async (opts?: { suppressToast?: boolean }) => {
      if (!user) return;
      try {
        setLoading(true);
        const [today, history, statistics] = await Promise.all([
          getTodayAttendance(user.uid),
          getAttendanceHistory(user.uid),
          getAttendanceStats(user.uid),
        ]);

        setTodayAttendance(today);
        setAttendanceHistory(history);
        setStats({
          daysPresent: statistics.daysPresent,
          totalWorkingDays: statistics.totalWorkingDays,
          attendanceRate: statistics.attendanceRate,
        });

        setLastUpdated(Date.now());
      } catch (error: any) {
        console.error("Error loading attendance data:", error);
        if (!opts?.suppressToast) toast.error("Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (user) loadAttendanceData();
  }, [user, loadAttendanceData]);

  useEffect(() => {
    const onUpdated = () => loadAttendanceData();
    window.addEventListener("attendance:updated", onUpdated);
    return () => window.removeEventListener("attendance:updated", onUpdated);
  }, [loadAttendanceData]);

  useEffect(() => {
    if (!pollingEnabled) return;
    const i = setInterval(
      () => loadAttendanceData({ suppressToast: true }),
      30_000,
    );
    return () => clearInterval(i);
  }, [pollingEnabled, loadAttendanceData]);

  const handleMarkAttendance = () => {
    if (!organization?.orgID) {
      toast.error("Organization information not found");
      return;
    }
    setLocationStatus("idle");
    setLocationMessage("");
    setLocationAction("checkin");
    setLocationAttendanceDocId(null);
    setShowLocationDialog(true);
  };

  const handleRequestCheckoutVerification = (attendanceId: string | null) => {
    if (!organization?.orgID) {
      toast.error("Organization information not found");
      return;
    }
    setLocationAction("checkout");
    setLocationAttendanceDocId(attendanceId ?? null);
    setShowLocationDialog(true);
  };

  const handleAttendanceMarked = () => {
    loadAttendanceData();
    toast.success("Attendance recorded");
  };

  const handleManualRefresh = async () => {
    await loadAttendanceData();
    toast.success("Dashboard refreshed");
  };

  const handleLogoutConfirm = async () => {
    try {
      setLoggingOut(true);
      await logout();
      toast.success("Logged out successfully");
      setLogoutDialogOpen(false);
    } catch (err: any) {
      console.error("Logout error", err);
      toast.error(err?.message || "Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
          <SidebarTrigger />
          <div className="mx-2 h-6 border-l border-gray-200" aria-hidden />
          <div className="flex-1 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-semibold truncate">
                Dashboard
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {lastUpdated
                  ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}`
                  : "Not updated yet"}
              </p>
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading}
                title="Refresh dashboard"
                className="h-9 px-2 sm:px-3"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden lg:inline ml-2">Refresh</span>
              </Button>

              {/* Auto-refresh Toggle - Hidden on small screens */}
              <Button
                variant={pollingEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPollingEnabled((v) => !v)}
                title="Toggle auto-refresh"
                className="hidden md:flex h-9"
              >
                <span className="text-xs">
                  Auto: {pollingEnabled ? "ON" : "OFF"}
                </span>
              </Button>

              {/* Logout Button - Always Visible */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLogoutDialogOpen(true)}
                className="h-9 px-2 sm:px-3 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 hover:text-red-800"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-8 w-3/5 mb-2" />
              <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-40" />
                <Skeleton className="h-40" />
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-48" />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1">
                  Welcome, {user?.name}!
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Track your attendance and view your records
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <MarkAttendanceCard
                  todayAttendance={todayAttendance}
                  onMarkAttendance={handleMarkAttendance}
                  requestCheckoutVerification={
                    handleRequestCheckoutVerification
                  }
                />
                <TodayStatusCard
                  todayAttendance={todayAttendance}
                  expectedShiftMinutes={expectedShiftMinutes}
                />
              </div>

              <MonthlyStatsGrid
                stats={stats}
                attendanceHistory={attendanceHistory}
              />

              <RecentAttendanceList
                attendanceHistory={attendanceHistory}
                showViewAll
              />
            </div>
          )}
        </main>
      </SidebarInset>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-red-900 dark:text-red-100">
                  Sign Out?
                </DialogTitle>
                <DialogDescription className="text-red-800 dark:text-red-200 mt-1">
                  You will need to sign in again to access your account.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              onClick={() => setLogoutDialogOpen(false)}
              disabled={loggingOut}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogoutConfirm}
              disabled={loggingOut}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {organization?.orgID && (
        <LocationDialog
          orgId={organization.orgID}
          open={showLocationDialog}
          onOpenChange={setShowLocationDialog}
          action={locationAction}
          attendanceDocId={locationAttendanceDocId}
          locationStatus={locationStatus}
          setLocationStatus={setLocationStatus}
          locationMessage={locationMessage}
          setLocationMessage={setLocationMessage}
          onAttendanceMarked={handleAttendanceMarked}
        />
      )}
    </>
  );
}
