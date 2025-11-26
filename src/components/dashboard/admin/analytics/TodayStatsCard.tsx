"use client";

import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Palmtree, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodayStats } from "@/lib/firebase/analytics-service";

interface TodayStatsCardsProps {
  stats: TodayStats;
  loading?: boolean;
}

export function TodayStatsCards({ stats, loading }: TodayStatsCardsProps) {
  const cards = [
    {
      label: "Present",
      value: stats.present,
      total: stats.totalEmployees,
      percentage: stats.presentPercentage,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      label: "Absent",
      value: stats.absent,
      total: stats.totalEmployees,
      percentage: Math.round((stats.absent / stats.totalEmployees) * 100),
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      label: "On Leave",
      value: stats.onLeave,
      total: stats.totalEmployees,
      percentage: Math.round((stats.onLeave / stats.totalEmployees) * 100),
      icon: Palmtree,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label: "Late Arrivals",
      value: stats.late,
      total: stats.totalEmployees,
      percentage: Math.round((stats.late / stats.totalEmployees) * 100),
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">
                {card.label}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">
                  {card.value}
                </p>
                <span className="text-sm text-muted-foreground">
                  / {card.total}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {card.percentage}% of total
              </p>
            </div>
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", card.bgColor)}>
              <card.icon className={cn("w-6 h-6", card.color)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}