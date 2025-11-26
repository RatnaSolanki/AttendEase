"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  Palmtree,
  Sun,
  X,
} from "lucide-react";
import {
  getAttendanceCalendar,
  type AttendanceRecord,
  type AttendanceStatus,
} from "@/lib/firebase/attendance";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance } from "@/lib/utils/location";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"]; // For mobile

function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateDisplay(dateString: string): string {
  const date = createLocalDate(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AttendanceCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadAttendance = useCallback(async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const calendar = await getAttendanceCalendar(user.uid, year, month);
      setAttendanceMap(calendar);
    } catch (error) {
      console.error("Failed to load attendance calendar:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, year, month]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth()) {
      return;
    }
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const calculateStats = () => {
    const records = Array.from(attendanceMap.values());
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const leave = records.filter(r => r.status === "leave").length;
    
    // ✅ FIXED: Calculate total working days in month (not just past days)
    let workingDays = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isSunday = dayOfWeek === 0;
      
      // ✅ Count ALL working days (Mon-Sat), not just past days
      if (!isSunday) {
        workingDays++;
      }
    }
    
    // ✅ Attendance percentage based on ALL working days in month
    const attendancePercentage = workingDays > 0 
      ? Math.round((present / workingDays) * 100) 
      : 0;

    const totalMinutes = records.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);

    return { present, absent, leave, workingDays, attendancePercentage, totalHours };
  };

  const stats = calculateStats();

  const getStatusConfig = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return {
          icon: CheckCircle,
          label: "Present",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
          borderColor: "border-emerald-300 dark:border-emerald-800",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          dotColor: "bg-emerald-500",
          hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-950/30"
        };
      case "absent":
        return {
          icon: XCircle,
          label: "Absent",
          bgColor: "bg-rose-50 dark:bg-rose-950/20",
          borderColor: "border-rose-300 dark:border-rose-800",
          iconColor: "text-rose-600 dark:text-rose-400",
          dotColor: "bg-rose-500",
          hoverBg: "hover:bg-rose-100 dark:hover:bg-rose-950/30"
        };
      case "leave":
        return {
          icon: Palmtree,
          label: "On Leave",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-300 dark:border-blue-800",
          iconColor: "text-blue-600 dark:text-blue-400",
          dotColor: "bg-blue-500",
          hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-950/30"
        };
    }
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getDateString(today);

    const days = [];
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    // Empty cells
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Render each day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = getDateString(date);
      
      const record = attendanceMap.get(dateStr);
      const isToday = dateStr === todayStr;
      const isSelected = selectedDate === dateStr;
      const isFuture = date > today;
      
      const dayOfWeek = date.getDay();
      const isSunday = dayOfWeek === 0;
      const isSaturday = dayOfWeek === 6;

      let displayStatus: AttendanceStatus | undefined = undefined;
      if (!isSunday && !isFuture) {
        if (record?.status === 'weekend' && isSaturday) {
          displayStatus = 'absent';
        } else {
          displayStatus = record ? record.status : 'absent';
        }
      }

      const statusConfig = displayStatus ? getStatusConfig(displayStatus) : undefined;
      const StatusIcon = statusConfig?.icon;
      const canClick = !isFuture && !isSunday && displayStatus !== undefined;

      days.push(
        <div key={day} className="aspect-square">
          <button
            onClick={() => canClick ? setSelectedDate(isSelected ? null : dateStr) : null}
            disabled={!canClick}
            className={cn(
              "relative w-full h-full rounded-md md:rounded-lg transition-all duration-200 border",
              // Sunday styling
              isSunday && "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 border-gray-300 dark:border-gray-700 cursor-default",
              // Future days
              !isSunday && isFuture && "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 opacity-40 cursor-not-allowed",
              // Working days with status
              !isSunday && !isFuture && statusConfig && cn(
                statusConfig.bgColor,
                statusConfig.borderColor,
                statusConfig.hoverBg,
                "cursor-pointer active:scale-95"
              ),
              // Working days without record
              !isSunday && !isFuture && !statusConfig && "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-800",
              // Today ring
              isToday && "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-950",
              // Selected state
              isSelected && "shadow-lg scale-105 z-10"
            )}
          >
            <div className="flex flex-col h-full p-1 md:p-2">
              {/* Day number and indicator */}
              <div className="flex items-start justify-between">
                <span className={cn(
                  "text-xs md:text-sm font-bold leading-none",
                  isToday ? "text-blue-600 dark:text-blue-400" :
                  isSunday ? "text-gray-500" :
                  isFuture ? "text-gray-400" :
                  "text-gray-900 dark:text-gray-100"
                )}>
                  {day}
                </span>
                
                {/* Status dot - smaller on mobile */}
                {!isFuture && !isSunday && statusConfig && (
                  <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", statusConfig.dotColor)} />
                )}
              </div>

              {/* Icon - responsive sizing */}
              <div className="flex-1 flex items-center justify-center">
                {isSunday && (
                  <Sun className="w-4 h-4 md:w-6 md:h-6 text-gray-400" />
                )}
                {!isSunday && !isFuture && StatusIcon && (
                  <StatusIcon className={cn("w-4 h-4 md:w-7 md:h-7", statusConfig.iconColor)} />
                )}
              </div>

              {/* Check-in time badge - hidden on mobile */}
              {!isSunday && !isFuture && record?.checkInTime && (
                <div className="mt-0.5 hidden sm:block">
                  <span className="text-[9px] md:text-[10px] font-medium text-gray-600 dark:text-gray-400">
                    {record.checkInTime.substring(0, 5)}
                  </span>
                </div>
              )}

              {/* Location indicator - smaller on mobile */}
              {!isSunday && !isFuture && record?.locationVerified !== undefined && (
                <div className="absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1">
                  <div className={cn(
                    "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                    record.locationVerified ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  )} />
                </div>
              )}
            </div>
          </button>
        </div>
      );
    }

    return days;
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return year === today.getFullYear() && month === today.getMonth();
  };

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 md:h-28 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[500px] md:h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  const selectedRecord = selectedDate ? attendanceMap.get(selectedDate) : undefined;
  
  const fixedSelectedRecord = selectedRecord && selectedDate ? (() => {
    const date = createLocalDate(selectedDate);
    const isSaturday = date.getDay() === 6;
    
    if (selectedRecord.status === 'weekend' && isSaturday) {
      return {
        ...selectedRecord,
        status: 'absent' as AttendanceStatus
      };
    }
    return selectedRecord;
  })() : selectedRecord;
  
  const selectedStatusConfig = (fixedSelectedRecord && fixedSelectedRecord.status) ? getStatusConfig(fixedSelectedRecord.status) : undefined;

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6 max-w-7xl mx-auto">
      {/* Stats Cards - Responsive Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4"
      >
        {/* Present Days */}
        <Card className="p-4 md:p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Days Present</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.present}</p>
              <p className="text-[10px] md:text-xs text-gray-500">of {stats.workingDays} working days</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </Card>

        {/* Total Hours */}
        <Card className="p-4 md:p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total Hours</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalHours}h</p>
              <p className="text-[10px] md:text-xs text-gray-500">worked this month</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </Card>

        {/* Attendance Rate */}
        <Card className="p-4 md:p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Attendance Rate</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.attendancePercentage}%</p>
              {/* ✅ CHANGED: Show "X days present" instead of "X absent, X leave" */}
              <p className="text-[10px] md:text-xs text-gray-500">{stats.present} days present</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Calendar Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-3 md:p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg">
          {/* Header - Mobile Optimized */}
          <div className="flex flex-col gap-3 mb-4 md:mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {MONTHS[month]} {year}
                </h2>
                <p className="text-[10px] md:text-sm text-gray-600 dark:text-gray-400 mt-0.5 md:mt-1">
                  Mon - Sat working days
                </p>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-8 w-8 md:h-10 md:w-10 border-gray-300"
                >
                  <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                </Button>

                <Button
                  onClick={goToToday}
                  disabled={isCurrentMonth()}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 md:h-10 px-2 md:px-4 text-xs md:text-sm"
                >
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                  <span className="hidden md:inline">Today</span>
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  disabled={isCurrentMonth()}
                  className="h-8 w-8 md:h-10 md:w-10 border-gray-300"
                >
                  <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Day Headers - Responsive */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1 md:mb-2">
            {DAYS.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "text-center py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-md md:rounded-lg",
                  index === 6 
                    ? "bg-gray-100 dark:bg-gray-900 text-gray-500" 
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                )}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="inline sm:hidden">{DAYS_SHORT[index]}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid - Tighter gaps on mobile */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4 md:mb-6">
            {renderCalendar()}
          </div>

          {/* Legend - Responsive */}
          <div className="pt-4 md:pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 lg:gap-6">
              <div className="flex items-center gap-1.5 md:gap-2">
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-[10px] md:text-sm text-gray-700 dark:text-gray-300">Present</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <XCircle className="w-3 h-3 md:w-4 md:h-4 text-rose-600 flex-shrink-0" />
                <span className="text-[10px] md:text-sm text-gray-700 dark:text-gray-300">Absent</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Palmtree className="w-3 h-3 md:w-4 md:h-4 text-blue-600 flex-shrink-0" />
                <span className="text-[10px] md:text-sm text-gray-700 dark:text-gray-300">Leave</span>
              </div>
              <div className="h-3 md:h-4 w-px bg-gray-300 dark:bg-gray-700 hidden sm:block" />
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-[10px] md:text-sm text-gray-700 dark:text-gray-300">Verified</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-[10px] md:text-sm text-gray-700 dark:text-gray-300">Outside</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Selected Day Details - Compact and Clean */}
      <AnimatePresence mode="wait">
        {selectedDate && selectedRecord && selectedStatusConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card className={cn(
              "p-4 md:p-6 bg-white dark:bg-gray-950 border-2 shadow-xl",
              selectedStatusConfig.borderColor
            )}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {formatDateDisplay(selectedDate)}
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedStatusConfig.icon && (
                      <selectedStatusConfig.icon className={cn("w-4 h-4 md:w-5 md:h-5", selectedStatusConfig.iconColor)} />
                    )}
                    <span className={cn("text-base md:text-lg font-bold", selectedStatusConfig.iconColor)}>
                      {selectedStatusConfig.label}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(null)}
                  className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0"
                >
                  <X className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
              </div>

              {/* Show details ONLY if present with data */}
              {selectedRecord.status === 'present' && (
                selectedRecord.checkInTime || 
                selectedRecord.checkOutTime || 
                selectedRecord.workedMinutes !== undefined || 
                selectedRecord.locationVerified !== undefined
              ) ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                  {/* Check In */}
                  {selectedRecord.checkInTime && (
                    <div className="p-3 md:p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-[9px] md:text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Check In</span>
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedRecord.checkInTime.substring(0, 5)}
                      </p>
                    </div>
                  )}

                  {/* Check Out */}
                  {selectedRecord.checkOutTime && (
                    <div className="p-3 md:p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-[9px] md:text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Check Out</span>
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedRecord.checkOutTime.substring(0, 5)}
                      </p>
                    </div>
                  )}

                  {/* Duration */}
                  {selectedRecord.workedMinutes !== undefined && (
                    <div className="p-3 md:p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                        <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-[9px] md:text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Duration</span>
                      </div>
                      <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {Math.floor(selectedRecord.workedMinutes / 60)}h {selectedRecord.workedMinutes % 60}m
                      </p>
                    </div>
                  )}

                  {/* Location */}
                  {selectedRecord.locationVerified !== undefined && (
                    <div className={cn(
                      "p-3 md:p-4 rounded-lg border",
                      selectedRecord.locationVerified 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    )}>
                      <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                        <MapPin className={cn(
                          "w-3 h-3 md:w-4 md:h-4 flex-shrink-0",
                          selectedRecord.locationVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        )} />
                        <span className={cn(
                          "text-[9px] md:text-xs font-bold uppercase",
                          selectedRecord.locationVerified ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                        )}>
                          Location
                        </span>
                      </div>
                      <p className="text-sm md:text-lg font-bold text-gray-900 dark:text-gray-100 mb-0.5 md:mb-1">
                        {selectedRecord.locationVerified ? "Verified ✓" : "Outside"}
                      </p>
                      {selectedRecord.distanceFromOffice !== undefined && (
                        <p className="text-[9px] md:text-xs text-gray-600 dark:text-gray-400">
                          {formatDistance(selectedRecord.distanceFromOffice)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Compact message for absent/leave or no data
                <div className="flex items-center justify-center py-3 md:py-4">
                  <div className="text-center">
                    <div className={cn(
                      "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3",
                      selectedStatusConfig.bgColor,
                      selectedStatusConfig.borderColor,
                      "border-2"
                    )}>
                      {selectedStatusConfig.icon && (
                        <selectedStatusConfig.icon className={cn("w-6 h-6 md:w-8 md:h-8", selectedStatusConfig.iconColor)} />
                      )}
                    </div>
                    <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">
                      {selectedRecord.status === 'absent' 
                        ? 'No attendance recorded for this day' 
                        : selectedRecord.status === 'leave'
                        ? 'Employee was on leave'
                        : 'No attendance data available'}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}