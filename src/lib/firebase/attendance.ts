import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { verifyLocation } from "@/lib/utils/location";

export type AttendanceStatus = "present" | "absent" | "late" | "leave" | "half-day" | "weekend" | "holiday";

export type AttendanceRecord = {
  id: string;
  userId: string;
  organizationId?: string;
  date?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: AttendanceStatus;
  location?: { latitude: number; longitude: number } | null;
  locationVerified?: boolean;
  checkoutLocation?: { latitude: number; longitude: number } | null;
  checkoutLocationVerified?: boolean;
  timestamp?: any;
  workedMinutes?: number;
  overtimeMinutes?: number;
  distanceFromOffice?: number;
  checkoutDistanceFromOffice?: number;
  officeLocation?: { latitude: number; longitude: number };
  leaveType?: "sick" | "casual" | "earned" | "unpaid" | null;
  leaveReason?: string;
  notes?: string;
};

const ALLOWED_RADIUS_METERS = 50;

// ✅ HELPER: Get local date string consistently
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ✅ HELPER: Get local time string
function getLocalTimeString(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export async function getOfficeLocation(
  orgId: string
): Promise<{ latitude: number; longitude: number }> {
  try {
    const orgDoc = await getDoc(doc(db, "organizations", orgId));
    if (orgDoc.exists()) {
      const data = orgDoc.data();
      if (data?.officeLocation) {
        return data.officeLocation;
      }
      if (data?.settings?.officeLocation) {
        return data.settings.officeLocation;
      }
    }
  } catch (error) {
    console.warn("Could not fetch office location from Firestore:", error);
  }

  return {
    latitude: 23.0225,
    longitude: 72.5714,
  };
}

// ✅ FIXED: Check-in with local timezone
export async function markAttendance(
  userId: string,
  orgId: string,
  options?: {
    location?: { latitude: number; longitude: number } | null;
    locationVerified?: boolean;
    officeLocation?: { latitude: number; longitude: number };
    distanceFromOffice?: number;
  }
): Promise<string> {
  const attendanceCol = collection(db, "attendance");
  const now = new Date();

  console.log("🔵 Check-in started at:", now.toISOString());

  // Get office location
  const officeLocation =
    options?.officeLocation || (await getOfficeLocation(orgId));

  // Validate location is provided
  if (!options?.location) {
    throw new Error("Location is required to mark attendance");
  }

  // Verify location is within radius
  const verification = verifyLocation(
    options.location,
    officeLocation,
    ALLOWED_RADIUS_METERS
  );

  // STRICT: Deny if outside radius
  if (!verification.isWithinRadius) {
    throw new Error(
      `Check-in denied: You are ${Math.round(verification.distance)}m away from office. You must be within ${ALLOWED_RADIUS_METERS}m to check in.`
    );
  }

  // ✅ Use local date string
  const todayStr = getLocalDateString(now);
  console.log("📅 Today's date string:", todayStr);

  const existingQuery = query(
    attendanceCol,
    where("userId", "==", userId)
  );

  const existingDocs = await getDocs(existingQuery);
  
  // Filter today's records in JavaScript
  const todayRecords = existingDocs.docs.filter(doc => {
    const data = doc.data();
    console.log("🔍 Checking existing record date:", data.date, "vs", todayStr);
    return data.date === todayStr;
  });

  if (todayRecords.length > 0) {
    console.log("❌ Already checked in today");
    throw new Error("You have already checked in today");
  }

  // Create attendance record with local date/time
  const payload: any = {
    userId,
    organizationId: orgId,
    timestamp: Timestamp.fromDate(now),
    date: todayStr, // ✅ Local date
    checkInTime: getLocalTimeString(now), // ✅ Local time
    checkOutTime: null,
    status: "present",
    location: options.location,
    locationVerified: true,
    officeLocation,
    distanceFromOffice: Math.round(verification.distance),
    createdAt: serverTimestamp(),
  };

  console.log("✅ Creating attendance record:", payload);

  const docRef = await addDoc(attendanceCol, payload);
  console.log("✅ Attendance record created with ID:", docRef.id);
  
  return docRef.id;
}

// ✅ FIXED: Check-out with local timezone
export async function markCheckout(
  attendanceDocId: string | null,
  userId: string,
  opts?: {
    expectedShiftMinutes?: number;
    verifyLocation?: boolean;
    location?: { latitude: number; longitude: number } | null;
    officeLocation?: { latitude: number; longitude: number };
  }
): Promise<void> {
  const expectedShiftMinutes = opts?.expectedShiftMinutes ?? 9 * 60;

  // Validate location is provided
  if (!opts?.location) {
    throw new Error("Location is required to check out");
  }

  if (!opts?.officeLocation) {
    throw new Error("Office location not available");
  }

  // Verify location is within radius
  const verification = verifyLocation(
    opts.location,
    opts.officeLocation,
    ALLOWED_RADIUS_METERS
  );

  // STRICT: Deny if outside radius
  if (!verification.isWithinRadius) {
    throw new Error(
      `Check-out denied: You are ${Math.round(verification.distance)}m away from office. You must be within ${ALLOWED_RADIUS_METERS}m to check out.`
    );
  }

  // Find attendance record
  let attendanceRef;
  if (attendanceDocId) {
    attendanceRef = doc(db, "attendance", attendanceDocId);
    const snap = await getDoc(attendanceRef);
    if (!snap.exists()) {
      attendanceRef = null;
    }
  }

  if (!attendanceRef) {
    const todayStr = getLocalDateString();

    const q = query(
      collection(db, "attendance"),
      where("userId", "==", userId)
    );

    const snaps = await getDocs(q);
    
    // Filter today's records in JavaScript
    const todayRecords = snaps.docs.filter(doc => {
      const data = doc.data();
      return data.date === todayStr;
    });

    if (todayRecords.length === 0) {
      throw new Error("No attendance record found for today");
    }

    // Get the most recent one
    const sortedRecords = todayRecords.sort((a, b) => {
      const aTime = a.data().timestamp?.toMillis() || 0;
      const bTime = b.data().timestamp?.toMillis() || 0;
      return bTime - aTime;
    });

    attendanceRef = sortedRecords[0].ref;
  }

  const now = new Date();
  const checkOutTimeStr = getLocalTimeString(now);

  const snap = await getDoc(attendanceRef);
  if (!snap.exists()) throw new Error("Attendance record not found");

  const data = snap.data() as any;
  const checkInTimeStr: string | undefined = data.checkInTime;
  const dateStr: string = data.date || getLocalDateString();

  // Calculate worked minutes
  let workedMinutes: number | undefined;
  try {
    const start = new Date(`${dateStr} ${checkInTimeStr}`);
    if (!isNaN(start.getTime())) {
      workedMinutes = Math.round(
        (now.getTime() - start.getTime()) / (1000 * 60)
      );
    }
  } catch {
    // ignore
  }

  const overtimeMinutes =
    typeof workedMinutes === "number"
      ? workedMinutes - expectedShiftMinutes
      : undefined;

  const payload: any = {
    checkOutTime: checkOutTimeStr,
    checkoutLocation: opts.location,
    checkoutLocationVerified: true,
    checkoutDistanceFromOffice: Math.round(verification.distance),
    updatedAt: serverTimestamp(),
  };

  if (typeof workedMinutes === "number") payload.workedMinutes = workedMinutes;
  if (typeof overtimeMinutes === "number")
    payload.overtimeMinutes = overtimeMinutes;

  await updateDoc(attendanceRef, payload);
}

// ✅ FIXED: Get Today's Attendance with local timezone
export async function getTodayAttendance(
  userId: string,
  orgId?: string
): Promise<AttendanceRecord | null> {
  const todayStr = getLocalDateString();

  console.log("🔍 getTodayAttendance - Looking for date:", todayStr);
  console.log("🔍 getTodayAttendance - UserId:", userId);

  // Query only by userId
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", userId)
  );

  const snaps = await getDocs(q);
  
  console.log("🔍 getTodayAttendance - Total records fetched:", snaps.size);
  
  // Filter today's records in JavaScript
  const todayRecords = snaps.docs.filter(doc => {
    const data = doc.data();
    const matchesDate = data.date === todayStr;
    const matchesOrg = !orgId || data.organizationId === orgId;
    
    console.log("🔍 Record check:", {
      docId: doc.id,
      recordDate: data.date,
      todayStr,
      matchesDate,
      matchesOrg,
      checkInTime: data.checkInTime
    });
    
    return matchesDate && matchesOrg;
  });

  console.log("✅ Today's records found:", todayRecords.length);

  if (todayRecords.length === 0) {
    console.log("❌ No attendance record found for today");
    return null;
  }

  // Get most recent
  const sortedRecords = todayRecords.sort((a, b) => {
    const aTime = a.data().timestamp?.toMillis() || 0;
    const bTime = b.data().timestamp?.toMillis() || 0;
    return bTime - aTime;
  });

  const d = sortedRecords[0];
  const data = d.data();
  
  console.log("✅ Returning attendance record:", {
    id: d.id,
    date: data.date,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime
  });
  
  return {
    id: d.id,
    userId: data.userId,
    organizationId: data.organizationId,
    date: data.date,
    checkInTime: data.checkInTime,
    checkOutTime: data.checkOutTime,
    status: data.status,
    location: data.location,
    locationVerified: data.locationVerified,
    checkoutLocation: data.checkoutLocation,
    checkoutLocationVerified: data.checkoutLocationVerified,
    timestamp: data.timestamp,
    workedMinutes: data.workedMinutes,
    overtimeMinutes: data.overtimeMinutes,
    distanceFromOffice: data.distanceFromOffice,
    checkoutDistanceFromOffice: data.checkoutDistanceFromOffice,
    officeLocation: data.officeLocation,
    leaveType: data.leaveType,
    leaveReason: data.leaveReason,
    notes: data.notes,
  } as AttendanceRecord;
}

export async function getAttendanceHistory(
  userId: string,
  limitRecords = 100
): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", userId),
    limit(limitRecords)
  );
  const snaps = await getDocs(q);
  
  // Sort in JavaScript
  const records = snaps.docs.map(d => ({
    id: d.id,
    ...(d.data() as any),
  })) as AttendanceRecord[];

  return records.sort((a, b) => {
    const aTime = a.timestamp?.toMillis?.() || 0;
    const bTime = b.timestamp?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getMonthlyAttendance(
  userId: string,
  year: number,
  month: number
): Promise<AttendanceRecord[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  const startDateStr = getLocalDateString(startDate);
  const endDateStr = getLocalDateString(endDate);

  const q = query(
    collection(db, "attendance"),
    where("userId", "==", userId)
  );

  const snaps = await getDocs(q);
  
  // Filter by date range in JavaScript
  const records = snaps.docs
    .map(d => ({ id: d.id, ...(d.data() as any) }) as AttendanceRecord)
    .filter(record => {
      return record.date && record.date >= startDateStr && record.date <= endDateStr;
    });

  return records.sort((a, b) => {
    const aTime = a.timestamp?.toMillis?.() || 0;
    const bTime = b.timestamp?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

export async function getAttendanceCalendar(
  userId: string,
  year: number,
  month: number
): Promise<Map<string, AttendanceRecord>> {
  const records = await getMonthlyAttendance(userId, year, month);
  const attendanceMap = new Map<string, AttendanceRecord>();
  
  records.forEach((record) => {
    if (record.date) {
      attendanceMap.set(record.date, record);
    }
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = getLocalDateString(date);
    
    if (!attendanceMap.has(dateStr)) {
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek === 0) {
        attendanceMap.set(dateStr, {
          id: `weekend-${dateStr}`,
          userId,
          date: dateStr,
          status: "weekend",
          timestamp: Timestamp.fromDate(date),
        });
      } else {
        attendanceMap.set(dateStr, {
          id: `absent-${dateStr}`,
          userId,
          date: dateStr,
          status: "absent",
          timestamp: Timestamp.fromDate(date),
        });
      }
    }
  }

  return attendanceMap;
}

export async function updateUserProfile(
  uid: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (!uid) throw new Error("User id is required");
  const userRef = doc(db, "users", uid);
  const payload = {
    ...patch,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(userRef, payload);
}

export async function getAttendanceStats(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const attendanceMap = await getAttendanceCalendar(userId, year, month);
  const records = Array.from(attendanceMap.values());
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const presentDays = records.filter((r) => r.status === "present").length;
  const absentDays = records.filter((r) => r.status === "absent").length;
  const leaveDays = records.filter((r) => r.status === "leave").length;
  const lateDays = records.filter((r) => r.status === "late").length;
  const weekendDays = records.filter((r) => r.status === "weekend").length;
  const halfDays = records.filter((r) => r.status === "half-day").length;
  
  const workingDays = daysInMonth - weekendDays;
  const attendanceRate = workingDays === 0 ? 0 : Math.round((presentDays / workingDays) * 100);
  
  return {
    daysPresent: presentDays,
    daysAbsent: absentDays,
    daysOnLeave: leaveDays,
    lateDays,
    halfDays,
    totalWorkingDays: workingDays,
    totalWeekends: weekendDays,
    attendanceRate,
  };
}