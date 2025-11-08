"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Calendar,
  Loader2,
  X,
  CalendarDays,
  FileSpreadsheet,
  Info,
  Sparkles,
} from "lucide-react";
import { generateReport } from "@/lib/firebase/admin";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

type ReportType = "daily" | "weekly" | "monthly";

export function ReportsView() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [lastGeneratedMeta, setLastGeneratedMeta] = useState<{
    rows: number;
    filename?: string;
  } | null>(null);

  // Initialize defaults for the selected report type
  useEffect(() => {
    const now = new Date();

    if (reportType === "daily") {
      setStartDate(new Date(now));
      setEndDate(new Date(now));
    } else if (reportType === "weekly") {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(end.getDate() - 6);
      setStartDate(start);
      setEndDate(end);
    } else {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(start);
      setEndDate(end);
    }
  }, [reportType]);

  const validateDates = (): boolean => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return false;
    }
    if (startDate > endDate) {
      toast.error("Start date cannot be after end date");
      return false;
    }
    const diffDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays > 365) {
      toast.error("Date range cannot exceed 365 days");
      return false;
    }
    return true;
  };

  const handleGenerateReport = async () => {
    if (!user?.uid) return;
    if (!validateDates()) return;

    setIsGenerating(true);
    setPreviewRows([]);
    setLastGeneratedMeta(null);

    try {
      const startDateStr = startDate!.toISOString().split("T")[0];
      const endDateStr = endDate!.toISOString().split("T")[0];
      const reportData = await generateReport(
        user.uid,
        reportType,
        startDateStr,
        endDateStr,
      );

      if (!Array.isArray(reportData) || reportData.length === 0) {
        toast.success("No records found for the selected date range");
        setLastGeneratedMeta({ rows: 0 });
        setIsGenerating(false);
        return;
      }

      setPreviewRows(reportData.slice(0, 5));
      setLastGeneratedMeta({ rows: reportData.length });

      const csv = convertToCSV(reportData);
      const filename = `attendance-report-${reportType}-${startDateStr}-to-${endDateStr}.csv`;
      downloadCSV(csv, filename);

      setLastGeneratedMeta({ rows: reportData.length, filename });
      toast.success(
        `Report generated (${reportData.length} rows). Download started.`,
      );
    } catch (error: any) {
      console.error("generate report error", error);
      toast.error(error?.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return "";
    const allKeys = new Set<string>();
    data.forEach((row) => {
      Object.keys(row || {}).forEach((k) => allKeys.add(k));
    });
    const headers = Array.from(allKeys);
    const csvRows = [
      "\uFEFF" + headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const val = row?.[header];
            if (val === null || val === undefined) return '""';
            if (typeof val === "object")
              return `"${JSON.stringify(val).replace(/"/g, '""').replace(/\n/g, "\\n")}"`;
            const s = String(val).replace(/"/g, '""');
            return `"${s}"`;
          })
          .join(","),
      ),
    ];
    return csvRows.join("\n");
  };

  const downloadCSV = (csv: string, filename: string) => {
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("downloadCSV error", err);
      toast.error("Failed to trigger download");
    }
  };

  const resetForm = () => {
    setPreviewRows([]);
    setLastGeneratedMeta(null);
    const now = new Date();
    if (reportType === "daily") {
      setStartDate(now);
      setEndDate(now);
    } else if (reportType === "weekly") {
      const start = new Date();
      start.setDate(now.getDate() - 6);
      setStartDate(start);
      setEndDate(now);
    } else {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
      setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    }
  };

  return (
    <div className="w-full h-full px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Generate and download attendance reports
        </p>
      </div>

      {/* Report Type Selection - Equal Width Capsules */}
      <div className="flex gap-4">
        {(["daily", "weekly", "monthly"] as ReportType[]).map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={cn(
              "relative flex-1 p-4 rounded-xl border-2 transition-all duration-200",
              reportType === type
                ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg scale-105"
                : "border-border bg-card hover:border-primary/50 hover:shadow-md",
            )}
          >
            {reportType === type && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
            )}
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                  type === "daily"
                    ? "bg-blue-100 dark:bg-blue-900/30"
                    : type === "weekly"
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-purple-100 dark:bg-purple-900/30",
                )}
              >
                <Calendar
                  className={cn(
                    "w-6 h-6",
                    type === "daily"
                      ? "text-blue-600 dark:text-blue-400"
                      : type === "weekly"
                        ? "text-green-600 dark:text-green-400"
                        : "text-purple-600 dark:text-purple-400",
                  )}
                />
              </div>
              <div>
                <div className="font-semibold capitalize text-sm mb-0.5">
                  {type}
                </div>
                <div className="text-xs text-muted-foreground">
                  {type === "daily"
                    ? "Day-by-day"
                    : type === "weekly"
                      ? "Week-wise"
                      : "Month-wise"}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Configuration Card */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Configure Report</h3>
            <p className="text-xs text-muted-foreground">
              Select date range and generate CSV
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Date Pickers */}
        <div className="flex items-end gap-3 flex-wrap">
          {/* Start Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              Start Date
              <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-44 h-11 justify-start text-left font-normal gap-2 border-2 transition-all",
                    startDate &&
                      "ring-2 ring-primary/30 border-primary bg-primary/5",
                  )}
                >
                  <CalendarDays
                    className={cn(
                      "h-4 w-4 shrink-0",
                      startDate && "text-primary",
                    )}
                  />
                  <span className="text-sm">
                    {startDate
                      ? startDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Pick a date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <MiniCalendar onValueChange={setStartDate} value={startDate}>
                  <MiniCalendarNavigation direction="prev" />
                  <MiniCalendarDays>
                    {(date: Date) => (
                      <MiniCalendarDay date={date} key={date.toISOString()} />
                    )}
                  </MiniCalendarDays>
                  <MiniCalendarNavigation direction="next" />
                </MiniCalendar>
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              End Date
              <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-44 h-11 justify-start text-left font-normal gap-2 border-2 transition-all",
                    endDate &&
                      "ring-2 ring-primary/30 border-primary bg-primary/5",
                  )}
                >
                  <CalendarDays
                    className={cn(
                      "h-4 w-4 shrink-0",
                      endDate && "text-primary",
                    )}
                  />
                  <span className="text-sm">
                    {endDate
                      ? endDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Pick a date"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <MiniCalendar onValueChange={setEndDate} value={endDate}>
                  <MiniCalendarNavigation direction="prev" />
                  <MiniCalendarDays>
                    {(date: Date) => (
                      <MiniCalendarDay date={date} key={date.toISOString()} />
                    )}
                  </MiniCalendarDays>
                  <MiniCalendarNavigation direction="next" />
                </MiniCalendar>
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || !startDate || !endDate}
              className="h-11 gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Generate & Download
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={resetForm}
              className="h-11 gap-2"
            >
              <X className="w-4 h-4" />
              Reset
            </Button>
          </div>

          {lastGeneratedMeta && (
            <Badge variant="secondary" className="px-3 py-2">
              {lastGeneratedMeta.rows} rows
            </Badge>
          )}
        </div>
      </Card>

      {/* Preview and Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Card */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Report Preview</h4>
              <p className="text-xs text-muted-foreground">First 5 rows</p>
            </div>
          </div>

          <Separator className="my-3" />

          {isGenerating ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">
                Generating...
              </p>
            </div>
          ) : previewRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {Object.keys(previewRows[0]).map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 px-2 font-semibold text-xs text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      {Object.keys(previewRows[0]).map((h) => (
                        <td key={h} className="py-2 px-2 text-xs">
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No preview available
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              Important Notes
            </h4>
          </div>

          <Separator className="my-3 bg-blue-200 dark:bg-blue-800" />

          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0" />
              <span>CSV includes UTF-8 BOM for Excel</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0" />
              <span>Keep ranges under 1 year</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0" />
              <span>Empty results = no records found</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 flex-shrink-0" />
              <span>Generated in real-time</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
