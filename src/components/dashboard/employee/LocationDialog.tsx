"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { markAttendance, markCheckout } from "@/lib/firebase/attendance";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Navigation,
  Shield,
  MapPinned,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Action = "checkin" | "checkout";
type LocationStatus = "idle" | "requesting" | "verifying" | "success" | "error";

type Props = {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: Action;
  attendanceDocId?: string | null;
  onAttendanceMarked?: () => void;
  locationStatus?: LocationStatus;
  setLocationStatus?: (s: LocationStatus) => void;
  locationMessage?: string;
  setLocationMessage?: (m: string) => void;
  officeGeofence?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  } | null;
  timeoutMs?: number;
};

export default function LocationDialog({
  orgId,
  open,
  onOpenChange,
  action = "checkin",
  attendanceDocId = null,
  onAttendanceMarked,
  locationStatus,
  setLocationStatus,
  locationMessage,
  setLocationMessage,
  officeGeofence = null,
  timeoutMs = 8000,
}: Props) {
  const { user } = useAuth();

  const [internalStatus, setInternalStatus] = useState<LocationStatus>("idle");
  const [internalMessage, setInternalMessage] = useState("");
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const status = locationStatus ?? internalStatus;
  const message = locationMessage ?? internalMessage;

  const setStatus = (s: LocationStatus) => {
    if (setLocationStatus) setLocationStatus(s);
    else setInternalStatus(s);
  };

  const setMessage = (m: string) => {
    if (setLocationMessage) setLocationMessage(m);
    else setInternalMessage(m);
  };

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setMessage("");
      setCoords(null);
      setDistance(null);
    }
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

  const getCurrentPosition = (): Promise<GeolocationPosition> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not available"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      });
    });

  const verifyGeofence = async (): Promise<{
    ok: boolean;
    coords?: { latitude: number; longitude: number };
    message?: string;
  }> => {
    setStatus("requesting");
    setMessage("Requesting device location...");

    try {
      const pos = await getCurrentPosition();
      const found = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setCoords(found);
      setStatus("verifying");
      setMessage("Location obtained — verifying...");

      if (officeGeofence) {
        const dist = distanceMeters(found, {
          latitude: officeGeofence.latitude,
          longitude: officeGeofence.longitude,
        });
        setDistance(dist);

        if (dist <= officeGeofence.radiusMeters) {
          setStatus("success");
          setMessage("Location verified within office area.");
          return { ok: true, coords: found };
        } else {
          setStatus("error");
          const msg = `Outside office area by ${Math.round(dist - officeGeofence.radiusMeters)} meters`;
          setMessage(msg);
          return { ok: false, coords: found, message: msg };
        }
      }

      setStatus("success");
      setMessage("Location obtained successfully.");
      return { ok: true, coords: found };
    } catch (err: any) {
      console.error("geolocation error", err);
      const msg =
        err?.code === 1
          ? "Permission denied. Please allow location access."
          : err?.code === 2
            ? "Position unavailable. Check your device settings."
            : err?.code === 3
              ? "Location request timed out. Please try again."
              : err?.message || "Failed to get location.";
      setStatus("error");
      setMessage(msg);
      return { ok: false, message: msg };
    }
  };

  const handleConfirm = async () => {
    if (!user) {
      toast.error("Not signed in");
      return;
    }

    setStatus("requesting");
    setMessage("Requesting location...");

    try {
      const res = await verifyGeofence();
      if (!res.ok) {
        toast.error(res.message || "Location verification failed");
        return;
      }

      const locationPayload = res.coords
        ? { latitude: res.coords.latitude, longitude: res.coords.longitude }
        : null;

      if (action === "checkin") {
        await markAttendance(user.uid, orgId, {
          location: locationPayload,
          locationVerified: true,
        });
        toast.success("Checked in successfully!");
      } else {
        await markCheckout(attendanceDocId || null, user.uid, {
          expectedShiftMinutes: undefined,
          verifyLocation: true,
          location: locationPayload,
        });
        toast.success("Checked out successfully!");
      }

      onAttendanceMarked?.();
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent("attendance:updated"));
    } catch (err: any) {
      console.error("Location confirm error", err);
      toast.error(err?.message || "Failed to record attendance");
      setStatus("error");
      setMessage(String(err?.message ?? "Unknown error"));
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "idle":
        return <MapPin className="w-12 h-12 text-muted-foreground" />;
      case "requesting":
        return <Loader2 className="w-12 h-12 text-primary animate-spin" />;
      case "verifying":
        return <Navigation className="w-12 h-12 text-blue-500 animate-pulse" />;
      case "success":
        return <CheckCircle2 className="w-12 h-12 text-green-500" />;
      case "error":
        return <XCircle className="w-12 h-12 text-destructive" />;
      default:
        return <MapPin className="w-12 h-12 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "requesting":
        return "from-primary/10 to-primary/5";
      case "verifying":
        return "from-blue-500/10 to-blue-500/5";
      case "success":
        return "from-green-500/10 to-green-500/5";
      case "error":
        return "from-destructive/10 to-destructive/5";
      default:
        return "from-muted/30 to-muted/10";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                action === "checkin" ? "bg-green-500/10" : "bg-blue-500/10",
              )}
            >
              <MapPinned
                className={cn(
                  "w-5 h-5",
                  action === "checkin" ? "text-green-600" : "text-blue-600",
                )}
              />
            </div>
            {action === "checkin" ? "Check-in Location" : "Check-out Location"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Card */}
          <div
            className={cn(
              "rounded-xl p-6 bg-gradient-to-br transition-all duration-300",
              getStatusColor(),
            )}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                {getStatusIcon()}
                {status === "requesting" && (
                  <div className="absolute inset-0 animate-ping">
                    <Waves className="w-12 h-12 text-primary opacity-20" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  {status === "idle" && "Ready to Verify"}
                  {status === "requesting" && "Requesting Location..."}
                  {status === "verifying" && "Verifying Location..."}
                  {status === "success" && "Location Verified!"}
                  {status === "error" && "Verification Failed"}
                </h3>
                <p
                  className={cn(
                    "text-sm",
                    status === "error"
                      ? "text-destructive font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {message || "Click confirm to start location verification"}
                </p>
              </div>

              {/* Distance indicator */}
              {distance !== null && officeGeofence && (
                <div
                  className={cn(
                    "w-full rounded-lg p-3 border-2",
                    distance <= officeGeofence.radiusMeters
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        distance <= officeGeofence.radiusMeters
                          ? "text-green-700 dark:text-green-300"
                          : "text-red-700 dark:text-red-300",
                      )}
                    >
                      Distance from office:
                    </span>
                    <span
                      className={cn(
                        "text-sm font-bold",
                        distance <= officeGeofence.radiusMeters
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {Math.round(distance)} m
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        distance <= officeGeofence.radiusMeters
                          ? "bg-green-500"
                          : "bg-red-500",
                      )}
                      style={{
                        width: `${Math.min(100, (distance / officeGeofence.radiusMeters) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Location Permission Required
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                  We need to verify you're within the office area. Please allow
                  location access when your browser prompts you.
                </p>
              </div>
            </div>
          </div>

          {/* Coordinates display */}
          {coords && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Your Coordinates
                </span>
              </div>
              <p className="text-sm font-mono font-medium">
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {/* Office radius info */}
          {officeGeofence && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPinned className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Office Area
                </span>
              </div>
              <p className="text-sm font-medium">
                Radius:{" "}
                <span className="font-bold">
                  {Math.round(officeGeofence.radiusMeters)} meters
                </span>
              </p>
            </div>
          )}

          {/* Error help */}
          {status === "error" && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Troubleshooting
                  </p>
                  <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                    <li>
                      Check if location services are enabled on your device
                    </li>
                    <li>Allow location access in your browser settings</li>
                    <li>Ensure you have a stable internet connection</li>
                    <li>Try refreshing the page and attempt again</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === "requesting" || status === "verifying"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={status === "requesting" || status === "verifying"}
            className="gap-2"
          >
            {(status === "requesting" || status === "verifying") && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {action === "checkin" ? "Confirm Check-in" : "Confirm Check-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
