"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { markAttendance, markCheckout, getOfficeLocation } from "@/lib/firebase/attendance";
import { toast } from "sonner";

interface LocationDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "checkin" | "checkout";
  attendanceDocId: string | null;
  locationStatus: "idle" | "requesting" | "verifying" | "success" | "error";
  setLocationStatus: (status: "idle" | "requesting" | "verifying" | "success" | "error") => void;
  locationMessage: string;
  setLocationMessage: (message: string) => void;
  onAttendanceMarked: () => void;
}

export default function LocationDialog({
  orgId,
  open,
  onOpenChange,
  action,
  attendanceDocId,
  locationStatus,
  setLocationStatus,
  locationMessage,
  setLocationMessage,
  onAttendanceMarked,
}: LocationDialogProps) {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<GeolocationPosition | null>(null);
  const [officeLocation, setOfficeLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Load office location when dialog opens
  useEffect(() => {
    if (open && orgId) {
      getOfficeLocation(orgId)
        .then((loc) => {
          setOfficeLocation(loc);
          console.log("Office location loaded in dialog:", loc);
        })
        .catch((err) => {
          console.error("Failed to load office location:", err);
          setLocationMessage("Failed to load office location");
          setLocationStatus("error");
        });
    }
  }, [open, orgId, setLocationMessage, setLocationStatus]);

  useEffect(() => {
    if (!open) {
      setLocationStatus("idle");
      setLocationMessage("");
      setUserLocation(null);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const distanceMeters = (
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const aHarv =
      sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
    return R * c;
  };

    if (locationStatus !== "idle") return;

    setLocationStatus("requesting");
    setLocationMessage("Requesting location permission...");

    if (!navigator.geolocation) {
      setLocationMessage("Geolocation is not supported by your browser");
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation(position);
        setLocationStatus("verifying");
        setLocationMessage("Location captured. Verifying...");
      },
      (error) => {
        console.error("Geolocation error:", error);
        let msg = "Failed to get location";
        if (error.code === 1) msg = "Location permission denied";
        else if (error.code === 2) msg = "Location unavailable";
        else if (error.code === 3) msg = "Location request timed out";
        setLocationMessage(msg);
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [open, locationStatus, setLocationStatus, setLocationMessage]);

  const handleConfirm = async () => {
    if (!user || !userLocation || !officeLocation) {
      toast.error("Missing required information");
      return;
    }

    setLocationStatus("verifying");
    setLocationMessage("Processing attendance...");

    try {
      const location = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      };

      if (action === "checkin") {
        await markAttendance(user.uid, orgId, {
          location,
          officeLocation,
        });
        toast.success("Checked in successfully!");
      } else {
        // ✅ FIX: Pass officeLocation to markCheckout
        await markCheckout(attendanceDocId, user.uid, {
          location,
          officeLocation,
        });
        toast.success("Checked out successfully!");
      }

      setLocationStatus("success");
      setLocationMessage("Attendance marked successfully!");
      onAttendanceMarked();

      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error: any) {
      console.error("Location confirm error", error);
      setLocationMessage(error?.message || "Failed to mark attendance");
      setLocationStatus("error");
      toast.error(error?.message || "Failed to mark attendance");
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setLocationStatus("idle");
    setLocationMessage("");
    setUserLocation(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {action === "checkin" ? "Check In" : "Check Out"}
          </DialogTitle>
          <DialogDescription>
            We need to verify your location to mark attendance
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          {locationStatus === "requesting" && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-sm text-muted-foreground">{locationMessage}</p>
            </>
          )}

          {locationStatus === "verifying" && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
              <p className="text-sm text-muted-foreground">{locationMessage}</p>
            </>
          )}

          {locationStatus === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="text-sm text-green-600 font-medium">{locationMessage}</p>
            </>
          )}

          {locationStatus === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-red-600 font-medium">{locationMessage}</p>
            </>
          )}

          {userLocation && officeLocation && locationStatus === "verifying" && (
            <div className="w-full space-y-2 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Location captured</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  Lat: {userLocation.coords.latitude.toFixed(6)}, Lng: {userLocation.coords.longitude.toFixed(6)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={locationStatus === "verifying"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!userLocation || !officeLocation || locationStatus === "verifying" || locationStatus === "requesting"}
          >
            {locationStatus === "verifying" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}