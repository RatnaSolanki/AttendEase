"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import SlidingAttendanceToggle from "./SlidingAttendanceToggle";
import { type AttendanceRecord } from "@/lib/firebase/attendance";
import { CheckCircle, Clock, MapPin } from "lucide-react";

interface Props {
  todayAttendance: AttendanceRecord | null;
  onMarkAttendance: () => void;
  requestCheckoutVerification?: (attendanceId: string | null) => void;
}

export default function MarkAttendanceCard({
  todayAttendance,
  onMarkAttendance,
  requestCheckoutVerification,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isCheckedIn =
    !!todayAttendance &&
    !!todayAttendance.checkInTime &&
    !todayAttendance.checkOutTime;
  const isAlreadyCheckedOut =
    !!todayAttendance && !!todayAttendance.checkOutTime;

  const handleCheckIn = () => {
    if (!user) {
      toast.error("Not signed in");
      return;
    }
    setLoading(true);
    onMarkAttendance();
    // Note: loading state will be managed by parent dialog
    setTimeout(() => setLoading(false), 1000);
  };

  const handleCheckOut = () => {
    if (!user) {
      toast.error("Not signed in");
      return;
    }

    if (!todayAttendance?.id) {
      toast.error("No check-in record found for today");
      return;
    }

    setLoading(true);
    if (requestCheckoutVerification) {
      requestCheckoutVerification(todayAttendance.id);
    }
    setTimeout(() => setLoading(false), 1000);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "--:--";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Card className="p-3 bg-white shadow-sm max-w-full">
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Mark Attendance
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAlreadyCheckedOut
                ? "Completed for today"
                : isCheckedIn
                  ? "Currently checked in"
                  : "Ready to check in"}
            </p>
          </div>
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isAlreadyCheckedOut
                ? "bg-green-100"
                : isCheckedIn
                  ? "bg-blue-100"
                  : "bg-gray-100"
            }`}
          >
            <CheckCircle
              className={`w-4 h-4 ${
                isAlreadyCheckedOut
                  ? "text-green-600"
                  : isCheckedIn
                    ? "text-blue-600"
                    : "text-gray-400"
              }`}
            />
          </div>
        </div>

        {/* Status Info */}
        {todayAttendance && (
          <div className="bg-gray-50 rounded-md p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Check-in:</span>
              <span className="font-medium text-gray-900">
                {formatTime(todayAttendance.timestamp)}
              </span>
            </div>

            {todayAttendance.checkOutTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium text-gray-900">
                  {todayAttendance.checkOutTime}
                </span>
              </div>
            )}

            {todayAttendance.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Location verified</span>
              </div>
            )}
          </div>
        )}

        {/* Sliding Toggle */}
        <div className="flex justify-center pt-1">
          {isAlreadyCheckedOut ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Attendance Complete</span>
              </div>
            </div>
          ) : (
            <SlidingAttendanceToggle
              isCheckedIn={isCheckedIn}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              disabled={false}
              loading={loading}
            />
          )}
        </div>

        {/* Helper Text */}
        {!isAlreadyCheckedOut && (
          <p className="text-xs text-center text-gray-500 mt-1">
            {isCheckedIn
              ? "Slide right to check out with location verification"
              : "Slide right to check in with location verification"}
          </p>
        )}
      </div>
    </Card>
  );
}
