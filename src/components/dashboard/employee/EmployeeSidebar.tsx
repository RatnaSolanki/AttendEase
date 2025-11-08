"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Home,
  History,
  User,
  ChevronLeft,
  Building2,
  Settings,
  Bell,
  CreditCard,
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
import { toast } from "sonner";

type View = "dashboard" | "history" | "profile";

interface EmployeeSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function EmployeeSidebar({
  currentView,
  onViewChange,
}: EmployeeSidebarProps) {
  const { user, organization } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(e.target as Node))
        setProfileMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const navigationItems = [
    { title: "Dashboard", icon: Home, view: "dashboard" as View },
    { title: "Attendance", icon: History, view: "history" as View },
    { title: "Profile", icon: User, view: "profile" as View },
  ];

  return (
    <>
      {/* explicit border color to match header divider */}
      <Sidebar className="border-r border-gray-200 bg-white w-64">
        {/* Header */}
        <SidebarHeader className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold text-gray-900">
                  AttendEase
                </span>
                <span className="text-xs text-gray-500">Employee Portal</span>
              </div>
            </div>

            <button
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="py-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Navigation
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1 px-3">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentView === item.view;
                  return (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        onClick={() => onViewChange(item.view)}
                        className={`
                          group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full
                          ${active ? "bg-gray-900 text-white shadow-sm hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50"}
                        `}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-gray-600"}`}
                        />
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Organization Info */}
          <div className="mt-6 px-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Organization
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-start gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {organization?.name || "My Organization"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {organization?.orgID || "N/A"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-600">Role</span>
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100"
                >
                  {user?.role === "admin" ? "Admin" : "Employee"}
                </Badge>
              </div>
            </div>
          </div>
        </SidebarContent>

        {/* Footer - User Profile (logout removed from sidebar) */}
        <SidebarFooter className="border-t mt-auto p-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {user?.name || "User"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user?.email || "No email"}
                    </div>
                  </div>

                  <div className="ml-2 relative" ref={profileMenuRef}>
                    <button
                      aria-haspopup="true"
                      aria-expanded={profileMenuOpen}
                      onClick={() => setProfileMenuOpen((s) => !s)}
                      className="p-1 rounded-full hover:bg-gray-100 transition"
                      title="Open account menu"
                    >
                      <ChevronLeft
                        className={`w-4 h-4 transform ${profileMenuOpen ? "rotate-180" : ""} text-gray-600`}
                      />
                    </button>

                    {/* Profile dropdown - visually matches reference layout */}
                    {profileMenuOpen && (
                      <div
                        role="menu"
                        aria-orientation="vertical"
                        className="absolute right-0 bottom-12 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
                      >
                        <button
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            onViewChange("profile");
                          }}
                        >
                          <User className="w-4 h-4 text-gray-600" />
                          Account
                        </button>

                        <button
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            toast("Billing coming soon");
                          }}
                        >
                          <CreditCard className="w-4 h-4 text-gray-600" />
                          Billing
                        </button>

                        <button
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => {
                            setProfileMenuOpen(false);
                            toast("Notifications coming soon");
                          }}
                        >
                          <Bell className="w-4 h-4 text-gray-600" />
                          Notifications
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions shown when the menu is closed (keeps compact footprint like reference) */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewChange("profile")}
                    className="flex-1 h-9 text-xs font-medium border-gray-300 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    Profile
                  </Button>

                  {/* logout removed from sidebar: moved to header per request */}
                  <div className="h-9 w-9" aria-hidden />
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </>
  );
}
