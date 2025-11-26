"use client";

import { Card } from "@/components/ui/card";
import { type AttendanceRecord } from "@/lib/firebase/attendance";

interface Props {
  stats: {
    daysPresent: number;
    totalWorkingDays: number;
    attendanceRate: number;
  };
  attendanceHistory: AttendanceRecord[]; // required
}

/**
 * Lightweight sparkline renderer (no external dependency).
 * - Accepts an array of numbers and renders a simple SVG polyline.
 * - Keeps the UI small and typed without needing react-sparklines.
 */
function Sparkline({
  data,
  width = 100,
  height = 40,
  stroke = "#10b981",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden
      >
        <rect width={width} height={height} fill="transparent" />
      </svg>
    );
  }

  // normalize series to 0..1
  const max = Math.max(...data.map((v) => Math.abs(v)), 1);
  const len = data.length;
  const px = (i: number) => (i / Math.max(1, len - 1)) * width;
  const py = (v: number) => {
    // map positive/negative values to vertical center baseline
    // center is height / 2, positive goes upward, negative downward
    const center = height / 2;
    if (max === 0) return center;
    return center - (v / (max || 1)) * (height / 2) * 0.9; // 0.9 scale for padding
  };

  const points = data.map((v, i) => `${px(i)},${py(v)}`).join(" ");

  // small gradient/fill could be added but keep simple
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function computeOvertimeSeries(history: AttendanceRecord[], points = 8) {
  const series = history
    .filter((r) => typeof r.overtimeMinutes === "number")
    .slice(0, points)
    .map((r) => r.overtimeMinutes || 0)
    .reverse();
  while (series.length < points) series.unshift(0);
  return series;
}

export default function MonthlyStatsGrid({
  stats,
  attendanceHistory,
}: Props) {
  const overtimeSeries = computeOvertimeSeries(attendanceHistory, 12);
  const totalOvertimeMinutes = attendanceHistory.reduce(
    (acc, r) => acc + (r.overtimeMinutes ?? 0),
    0,
  );

  const formatMinutesToHours = (mins: number) => {
    const sign = mins > 0 ? "+" : mins < 0 ? "-" : "";
    const mag = Math.abs(mins);
    const h = Math.floor(mag / 60);
    const m = Math.abs(mag % 60);
    return `${sign}${h}h ${m}m`;
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="p-4">
        <div className="text-sm text-gray-500">This Month</div>
        <div className="text-2xl font-semibold">
          {stats.daysPresent}/{stats.totalWorkingDays}
        </div>
        <div className="text-xs text-gray-400">Days Present</div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Attendance Rate</div>
            <div className="text-2xl font-semibold">
              {stats.attendanceRate}%
            </div>
            <div className="text-xs text-gray-400">This Month</div>
          </div>

          <div className="w-28">
            <Sparkline
              data={overtimeSeries}
              width={100}
              height={40}
              stroke="#10b981"
            />
            <div className="text-xs text-gray-400 text-right mt-1">
              Overtime trend
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm text-gray-500">Total Overtime</div>
        <div className="text-2xl font-semibold">
          {formatMinutesToHours(totalOvertimeMinutes)}
        </div>
        <div className="text-xs text-gray-400">Accumulated</div>
      </Card>
    </div>
  );
}
