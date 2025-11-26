/**
 * Location utilities for attendance verification
 * Implements Haversine formula for distance calculation
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationVerificationResult {
  isWithinRadius: boolean;
  distance: number; // in meters
  userLocation: Coordinates;
  officeLocation: Coordinates;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Verify if user's location is within allowed radius of office
 * @param userLocation User's current GPS coordinates
 * @param officeLocation Office GPS coordinates
 * @param allowedRadiusMeters Allowed radius in meters (default: 100)
 * @returns Verification result with distance and status
 */
export function verifyLocation(
  userLocation: Coordinates,
  officeLocation: Coordinates,
  allowedRadiusMeters: number = 100
): LocationVerificationResult {
  const distance = haversineDistance(
    userLocation.latitude,
    userLocation.longitude,
    officeLocation.latitude,
    officeLocation.longitude
  );

  return {
    isWithinRadius: distance <= allowedRadiusMeters,
    distance: Math.round(distance), // Round to nearest meter
    userLocation,
    officeLocation,
  };
}

/**
 * Get user's current location from browser geolocation API
 * @returns Promise with user's coordinates
 */
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
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
        let errorMessage = "Unable to retrieve your location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "50m" or "1.2km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}