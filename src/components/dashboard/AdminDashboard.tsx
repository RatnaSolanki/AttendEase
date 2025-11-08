"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import AdminSidebar from "@/components/dashboard/admin/AdminSidebar";
import { DashboardView } from "@/components/dashboard/admin/DashboardView";
import { EmployeesView } from "@/components/dashboard/admin/EmployeesView";
import { AttendanceLogsView } from "@/components/dashboard/admin/AttendanceLogsView";
import { ReportsView } from "@/components/dashboard/admin/ReportsView";
import { OrganizationView } from "@/components/dashboard/admin/OrganizationView";
import { View } from "@/components/dashboard/admin/types";

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard";
      case "employees":
        return "Employees";
      case "attendance":
        return "Attendance Logs";
      case "reports":
        return "Reports";
      case "organization":
        return "Organization";
      default:
        return "Dashboard";
    }
  };

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          userName={user.name}
          onLogout={() => setShowLogoutConfirm(true)}
        />

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{getViewTitle()}</h1>
            </div>
          </header>

          <main className="flex-1 p-6">
            {currentView === "dashboard" && <DashboardView />}
            {currentView === "employees" && <EmployeesView />}
            {currentView === "attendance" && <AttendanceLogsView />}
            {currentView === "reports" && <ReportsView />}
            {currentView === "organization" && <OrganizationView />}
          </main>
        </SidebarInset>
      </div>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to logout?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You will need to sign in again to access your admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
