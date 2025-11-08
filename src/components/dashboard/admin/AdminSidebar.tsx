"use client";

import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Building2,
  User,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { View } from "./types";

interface AdminSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  userName: string;
  orgName?: string;
  onLogout: () => void;
}

const NAV_ITEMS: { title: string; icon: any; view: View }[] = [
  { title: "Dashboard", icon: LayoutDashboard, view: "dashboard" },
  { title: "Employees", icon: Users, view: "employees" },
  { title: "Attendance Logs", icon: ClipboardList, view: "attendance" },
  { title: "Reports", icon: FileText, view: "reports" },
  { title: "Organization", icon: Building2, view: "organization" },
];

export default function AdminSidebar({
  currentView,
  onViewChange,
  userName,
  orgName,
}: AdminSidebarProps) {
  return (
    <Sidebar className="border-r bg-white w-64">
      <SidebarHeader className="border-b px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900">AttendEase</span>
            <span className="text-xs text-gray-500">Admin Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onViewChange(item.view)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full
                        ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-600"}`}
                      />
                      <span
                        className={`text-sm font-medium ${isActive ? "text-white" : ""}`}
                      >
                        {item.title}
                      </span>
                      {isActive && (
                        <div className="absolute right-0 w-1 h-8 bg-white rounded-l-full" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {userName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  Administrator
                </div>
                {orgName && (
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {orgName}
                  </div>
                )}
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
