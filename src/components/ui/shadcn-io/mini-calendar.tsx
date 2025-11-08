"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MiniCalendarContextType {
  value: Date | undefined;
  onValueChange: (date: Date | undefined) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

const MiniCalendarContext = React.createContext<
  MiniCalendarContextType | undefined
>(undefined);

const useMiniCalendar = () => {
  const context = React.useContext(MiniCalendarContext);
  if (!context) {
    throw new Error("useMiniCalendar must be used within MiniCalendar");
  }
  return context;
};

interface MiniCalendarProps {
  value?: Date;
  onValueChange?: (date: Date | undefined) => void;
  children: React.ReactNode;
}

export function MiniCalendar({
  value,
  onValueChange,
  children,
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(value || new Date());

  React.useEffect(() => {
    if (value) {
      setCurrentMonth(value);
    }
  }, [value]);

  return (
    <MiniCalendarContext.Provider
      value={{
        value,
        onValueChange: onValueChange || (() => {}),
        currentMonth,
        setCurrentMonth,
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          {children}
        </div>
      </div>
    </MiniCalendarContext.Provider>
  );
}

interface MiniCalendarNavigationProps {
  direction: "prev" | "next";
}

export function MiniCalendarNavigation({
  direction,
}: MiniCalendarNavigationProps) {
  const { currentMonth, setCurrentMonth } = useMiniCalendar();

  const navigate = () => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={navigate}
      className="h-7 w-7"
      type="button"
    >
      {direction === "prev" ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </Button>
  );
}

interface MiniCalendarDaysProps {
  children: (date: Date) => React.ReactNode;
}

export function MiniCalendarDays({ children }: MiniCalendarDaysProps) {
  const { currentMonth } = useMiniCalendar();

  const startDate = new Date(currentMonth);
  startDate.setDate(startDate.getDate() - 2); // Show 2 days before current

  const days = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  return (
    <div className="flex items-center gap-2">
      {days.map((date) => children(date))}
    </div>
  );
}

interface MiniCalendarDayProps {
  date: Date;
}

export function MiniCalendarDay({ date }: MiniCalendarDayProps) {
  const { value, onValueChange } = useMiniCalendar();

  const isSelected =
    value &&
    date.getDate() === value.getDate() &&
    date.getMonth() === value.getMonth() &&
    date.getFullYear() === value.getFullYear();

  const isToday =
    date.getDate() === new Date().getDate() &&
    date.getMonth() === new Date().getMonth() &&
    date.getFullYear() === new Date().getFullYear();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <button
      type="button"
      onClick={() => onValueChange(date)}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg p-3 transition-colors min-w-[60px]",
        "hover:bg-accent hover:text-accent-foreground",
        isSelected &&
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        !isSelected && isToday && "border-2 border-primary",
      )}
    >
      <span className="text-xs font-medium">{monthNames[date.getMonth()]}</span>
      <span className="text-2xl font-bold">{date.getDate()}</span>
    </button>
  );
}
