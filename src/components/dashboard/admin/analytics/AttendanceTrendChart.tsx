"use client";

import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { AttendanceTrendPoint } from "@/lib/firebase/analytics-service";

interface AttendanceTrendChartProps {
  data: AttendanceTrendPoint[];
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">7-Day Attendance Trend</h3>
        <p className="text-sm text-muted-foreground">
          Daily attendance breakdown over the last week
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="present" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Present"
          />
          <Line 
            type="monotone" 
            dataKey="absent" 
            stroke="#EF4444" 
            strokeWidth={2}
            name="Absent"
          />
          <Line 
            type="monotone" 
            dataKey="leave" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="On Leave"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}