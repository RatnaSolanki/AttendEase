"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Building2,
  Loader2,
  Info,
  Check,
  Copy,
  Trash2,
  X,
  Navigation2,
  ExternalLink,
  AlertCircle,
  Ruler,
} from "lucide-react";
import {
  getOrganizationData,
  updateOrganizationLocation,
} from "@/lib/firebase/admin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Add this to your .env.local file:
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here

export function OrganizationView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("100");

  const [initialSnapshot, setInitialSnapshot] = useState<{
    name: string;
    latitude: string;
    longitude: string;
    radius: string;
  } | null>(null);

  const [errors, setErrors] = useState<{
    latitude?: string;
    longitude?: string;
    radius?: string;
  }>({});

  useEffect(() => {
    fetchOrganizationData();
  }, [user?.uid]);

  const fetchOrganizationData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getOrganizationData(user.uid);
      const lat = data?.officeLocation?.latitude ?? "";
      const lng = data?.officeLocation?.longitude ?? "";
      const rad = data?.officeLocation?.radius ?? 100;
      const name = data?.name ?? "";

      setOrgName(name);
      setLatitude(String(lat));
      setLongitude(String(lng));
      setRadius(String(rad));

      setInitialSnapshot({
        name: name || "",
        latitude: String(lat),
        longitude: String(lng),
        radius: String(rad),
      });
    } catch (err) {
      console.error("Failed to load organization data", err);
      toast.error("Failed to load organization settings");
    } finally {
      setLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      orgName !== initialSnapshot.name ||
      latitude !== initialSnapshot.latitude ||
      longitude !== initialSnapshot.longitude ||
      radius !== initialSnapshot.radius
    );
  }, [orgName, latitude, longitude, radius, initialSnapshot]);

  const googleMapsUrl = useMemo(() => {
    if (!latitude || !longitude) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
  }, [latitude, longitude]);

  const googleMapsEmbedUrl = useMemo(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!latitude || !longitude || !apiKey) return "";
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=17`;
  }, [latitude, longitude]);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseInt(radius, 10);

    if (latitude !== "") {
      if (Number.isNaN(lat)) nextErrors.latitude = "Must be a number";
      else if (lat < -90 || lat > 90)
        nextErrors.latitude = "Between -90 and 90";
    }

    if (longitude !== "") {
      if (Number.isNaN(lng)) nextErrors.longitude = "Must be a number";
      else if (lng < -180 || lng > 180)
        nextErrors.longitude = "Between -180 and 180";
    }

    if (radius !== "") {
      if (Number.isNaN(rad)) nextErrors.radius = "Must be a number";
      else if (rad < 10 || rad > 1000) nextErrors.radius = "10-1000 meters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not available");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success("Location captured");
        setGettingLocation(false);
      },
      (err) => {
        console.error("Geolocation error", err);
        toast.error("Unable to get location");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const handleCopyCoords = async () => {
    if (!latitude || !longitude) {
      toast.error("No coordinates to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(`${latitude}, ${longitude}`);
      toast.success("Coordinates copied");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleReset = () => {
    if (!initialSnapshot) return;
    setOrgName(initialSnapshot.name);
    setLatitude(initialSnapshot.latitude);
    setLongitude(initialSnapshot.longitude);
    setRadius(initialSnapshot.radius);
    setErrors({});
    toast("Changes reverted");
  };

  const handleClearLocation = () => {
    setLatitude("");
    setLongitude("");
    setRadius("100");
    toast("Location cleared");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.uid) return;

    if (!validate()) {
      toast.error("Please fix validation errors");
      return;
    }

    const lat = latitude === "" ? 0 : parseFloat(latitude);
    const lng = longitude === "" ? 0 : parseFloat(longitude);
    const rad = parseInt(radius, 10);

    setSaving(true);
    try {
      await updateOrganizationLocation(user.uid, lat, lng, rad);

      const newSnapshot = {
        name: orgName || "",
        latitude: String(lat),
        longitude: String(lng),
        radius: String(rad),
      };
      setInitialSnapshot(newSnapshot);

      toast.success("Settings saved");
    } catch (err: any) {
      console.error("Save error", err);
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">
            Organization Settings
          </h2>
          <p className="text-muted-foreground">
            Configure your organization's location and check-in radius
          </p>
        </div>
        {isDirty && (
          <Badge variant="secondary" className="gap-1.5">
            <AlertCircle className="w-3 h-3" />
            Unsaved changes
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                  <Building2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Organization Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Basic information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-sm font-medium">
                  Organization Name
                </Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Enter organization name"
                  className="h-11 text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Office Location</CardTitle>
                  <CardDescription className="text-xs">
                    GPS coordinates for check-in
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="latitude"
                    className="text-sm font-medium flex items-center gap-1.5"
                  >
                    Latitude
                    {latitude && !errors.latitude && (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </Label>
                  <Input
                    id="latitude"
                    type="text"
                    placeholder="37.7749"
                    value={latitude}
                    onChange={(e) => {
                      setLatitude(e.target.value);
                      if (errors.latitude)
                        setErrors({ ...errors, latitude: undefined });
                    }}
                    className={cn(
                      "h-11 text-base font-mono",
                      latitude &&
                        !errors.latitude &&
                        "border-green-500 bg-green-50 dark:bg-green-950/20",
                      errors.latitude && "border-destructive bg-destructive/5",
                    )}
                  />
                  {errors.latitude && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {errors.latitude}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="longitude"
                    className="text-sm font-medium flex items-center gap-1.5"
                  >
                    Longitude
                    {longitude && !errors.longitude && (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    )}
                  </Label>
                  <Input
                    id="longitude"
                    type="text"
                    placeholder="-122.4194"
                    value={longitude}
                    onChange={(e) => {
                      setLongitude(e.target.value);
                      if (errors.longitude)
                        setErrors({ ...errors, longitude: undefined });
                    }}
                    className={cn(
                      "h-11 text-base font-mono",
                      longitude &&
                        !errors.longitude &&
                        "border-green-500 bg-green-50 dark:bg-green-950/20",
                      errors.longitude && "border-destructive bg-destructive/5",
                    )}
                  />
                  {errors.longitude && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {errors.longitude}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={gettingLocation}
                  className="gap-2"
                >
                  {gettingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation2 className="w-4 h-4" />
                  )}
                  {gettingLocation
                    ? "Getting Location..."
                    : "Use Current Location"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCoords}
                  disabled={!latitude || !longitude}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearLocation}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Radius Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <Ruler className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Check-in Radius</CardTitle>
                  <CardDescription className="text-xs">
                    Allowed distance from office
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="radius" className="text-sm font-medium">
                  Radius (meters)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="radius"
                    type="number"
                    min={10}
                    max={1000}
                    value={radius}
                    onChange={(e) => {
                      setRadius(e.target.value);
                      if (errors.radius)
                        setErrors({ ...errors, radius: undefined });
                    }}
                    className={cn(
                      "h-11 text-base font-mono w-32",
                      errors.radius && "border-destructive bg-destructive/5",
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Employees must be within{" "}
                      <span className="font-semibold text-foreground">
                        {radius}m
                      </span>{" "}
                      to check in
                    </p>
                    {errors.radius && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <X className="w-3 h-3" />
                        {errors.radius}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    A smaller radius ensures employees are physically present at
                    the office location. Typical values: 50-200 meters.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={saving || !isDirty}
              size="lg"
              className="gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!isDirty}
              size="lg"
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Right Column - Map Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Location Preview
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {latitude && longitude
                        ? "Live map view"
                        : "No location set"}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Coordinates Display */}
              {latitude && longitude && (
                <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-muted-foreground">Lat:</span>
                    <span className="font-semibold">{latitude}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Lng:</span>
                    <span className="font-semibold">{longitude}</span>
                  </div>
                </div>
              )}

              {/* Map */}
              <div className="w-full h-64 border-2 rounded-xl overflow-hidden bg-muted/30">
                {latitude && longitude ? (
                  googleMapsEmbedUrl ? (
                    <iframe
                      src={googleMapsEmbedUrl}
                      className="w-full h-full border-0"
                      title="Google Maps Location"
                      loading="lazy"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Google Maps API Key Required
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local
                        file
                      </p>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No location set
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter coordinates to see preview
                    </p>
                  </div>
                )}
              </div>

              {/* External Links */}
              {latitude && longitude && (
                <div className="flex items-center gap-2">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-xs text-center px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors font-medium flex items-center justify-center gap-1.5"
                  >
                    Open in Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
