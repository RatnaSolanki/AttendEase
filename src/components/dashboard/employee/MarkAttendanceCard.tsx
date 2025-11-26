"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import SlidingAttendanceToggle from "./SlidingAttendanceToggle";
import { 
  markAttendance, 
  markCheckout, 
  type AttendanceRecord 
} from "@/lib/firebase/attendance";
import { CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { formatDistance } from "@/lib/utils/location";
import { useSound } from "@/hooks/useSound";

interface Props {
  todayAttendance: AttendanceRecord | null;
  onMarkAttendance: () => void;
  officeLocation: { lat: number; lng: number };
  radiusMeters?: number;
}

// ✅ Helper to format time to 12-hour format
function formatTimeTo12Hour(timeString: string | undefined): string {
  if (!timeString) return "--:--";
  
  try {
    // Handle HH:MM format (24-hour)
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    // Already formatted or other format
    return timeString;
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeString;
  }
}

export default function MarkAttendanceCard({
  todayAttendance,
  onMarkAttendance,
  officeLocation,
  radiusMeters = 50,
}: Props) {
  const { user, organization } = useAuth();
  const [processing, setProcessing] = useState(false);
  const { playCheckInSound, playCheckOutSound, playErrorSound } = useSound();

  const isCheckedIn =
    !!todayAttendance &&
    !!todayAttendance.checkInTime &&
    !todayAttendance.checkOutTime;
  const isAlreadyCheckedOut =
    !!todayAttendance && !!todayAttendance.checkOutTime;

  const getUserLocation = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator?.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          if (error.code === 1) reject(new Error("Location permission denied"));
          else if (error.code === 2) reject(new Error("Unable to get location"));
          else reject(new Error("Location request timed out"));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const handleCheckIn = async () => {
    if (!user || !organization?.orgID) {
      toast.error("Not signed in");
      playErrorSound();
      return;
    }

    setProcessing(true);

    try {
      const location = await getUserLocation();

      await markAttendance(user.uid, organization.orgID, {
        location,
        officeLocation: {
          latitude: officeLocation.lat,
          longitude: officeLocation.lng,
        },
      });

      playCheckInSound();
      toast.success("✓ Checked in successfully!");
      
      setTimeout(() => {
        onMarkAttendance();
      }, 500);

    } catch (err: any) {
      playErrorSound();
      toast.error(err?.message || "Failed to check in");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !organization?.orgID) {
      toast.error("Not signed in");
      playErrorSound();
      return;
    }

    if (!todayAttendance?.id) {
      toast.error("No check-in found");
      playErrorSound();
      return;
    }

    setProcessing(true);

    try {
      const location = await getUserLocation();

      await markCheckout(todayAttendance.id, user.uid, {
        location,
        officeLocation: {
          latitude: officeLocation.lat,
          longitude: officeLocation.lng,
        },
      });

      playCheckOutSound();
      toast.success("✓ Checked out successfully!");
      
      setTimeout(() => {
        onMarkAttendance();
      }, 500);

    } catch (err: any) {
      playErrorSound();
      toast.error(err?.message || "Failed to check out");
    } finally {
      setProcessing(false);
    }
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
              {processing ? (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </span>
              ) : isAlreadyCheckedOut ? (
                "Completed for today"
              ) : isCheckedIn ? (
                "Currently checked in"
              ) : (
                "Ready to check in"
              )}
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
            {/* ✅ Check-in Time (12-hour format) */}
            {todayAttendance.checkInTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Check-in:</span>
                <span className="font-medium text-gray-900">
                  {formatTimeTo12Hour(todayAttendance.checkInTime)}
                </span>
              </div>
            )}

            {/* ✅ Check-out Time (12-hour format) */}
            {todayAttendance.checkOutTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Check-out:</span>
                <span className="font-medium text-gray-900">
                  {formatTimeTo12Hour(todayAttendance.checkOutTime)}
                </span>
              </div>
            )}

            {todayAttendance.location && (
              <div className="flex items-start gap-2">
                {todayAttendance.locationVerified ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 text-rose-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Location:</span>
                    <span className="text-green-600 font-medium text-xs">
                      {todayAttendance.locationVerified ? "✓ Verified" : "Outside range"}
                    </span>
                  </div>
                  {todayAttendance.distanceFromOffice !== undefined && (
                    <span className="text-xs text-gray-500">
                      {formatDistance(todayAttendance.distanceFromOffice)} from office
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sliding Toggle */}
        <div className="w-full pt-1">
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
              disabled={processing}
              loading={processing}
            />
          )}
        </div>

        {/* Helper Text */}
        {!isAlreadyCheckedOut && (
          <div className="space-y-1">
            <p className="text-xs text-center text-gray-500">
              {isCheckedIn
                ? "Slide right to check out"
                : "Slide right to check in"}
            </p>
            <p className="text-xs text-center text-blue-600 font-medium">
              📍 Must be within {radiusMeters}m of office
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}