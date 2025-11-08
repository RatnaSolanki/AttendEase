"use client";

import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import EmployeeSidebar from "./employee/EmployeeSidebar";
import DashboardContent from "./employee/DashboardContent";
import HistoryContent from "./employee/HistoryContent";
import ProfileContent from "./employee/ProfileContent";

type View = "dashboard" | "history" | "profile";

export default function EmployeeDashboard() {
  const [currentView, setCurrentView] = useState<View>("dashboard");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <EmployeeSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {currentView === "dashboard" && <DashboardContent />}
        {currentView === "history" && <HistoryContent />}
        {currentView === "profile" && <ProfileContent />}
      </div>
    </SidebarProvider>
  );
}
