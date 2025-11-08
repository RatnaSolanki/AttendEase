// Replace or merge into your existing attendance helper file.
// Adds getAttendanceStats export so DashboardContent can import it.
// Adjust imports/paths to your firebase config as needed.

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
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";

export type AttendanceRecord = {
  id: string;
  userId: string;
  organizationId?: string;
  date?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: "present" | "absent" | "late" | string;
  location?: { latitude: number; longitude: number } | null;
  locationVerified?: boolean;
  checkoutLocation?: { latitude: number; longitude: number } | null;
  checkoutLocationVerified?: boolean;
  timestamp?: any;
  workedMinutes?: number;
  overtimeMinutes?: number;
};

export async function markAttendance(
  userId: string,
  orgId: string,
  options?: {
    location?: { latitude: number; longitude: number } | null;
    locationVerified?: boolean;
  },
): Promise<string> {
  const attendanceCol = collection(db, "attendance");
  const now = new Date();
  const payload: any = {
    userId,
    organizationId: orgId,
    timestamp: Timestamp.fromDate(now),
    date: now.toISOString().split("T")[0],
    checkInTime: now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    checkOutTime: null,
    status: "present",
    location: options?.location ?? null,
    locationVerified: !!options?.locationVerified,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(attendanceCol, payload);
  return docRef.id;
}

export async function markCheckout(
  attendanceDocId: string | null,
  userId: string,
  opts?: {
    expectedShiftMinutes?: number;
    verifyLocation?: boolean;
    location?: { latitude: number; longitude: number } | null;
  },
): Promise<void> {
  const expectedShiftMinutes = opts?.expectedShiftMinutes ?? 9 * 60; // default 9h

  let attendanceRef;
  if (attendanceDocId) {
    attendanceRef = doc(db, "attendance", attendanceDocId);
    const snap = await getDoc(attendanceRef);
    if (!snap.exists()) {
      attendanceRef = null;
    }
  }

  if (!attendanceRef) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const qConstraints: QueryConstraint[] = [
      where("userId", "==", userId),
      where("timestamp", ">=", Timestamp.fromDate(today)),
      where("timestamp", "<", Timestamp.fromDate(tomorrow)),
      orderBy("timestamp", "desc"),
      limit(1),
    ];

    const q = query(collection(db, "attendance"), ...qConstraints);
    const snaps = await getDocs(q);
    if (snaps.empty) throw new Error("No attendance record found for today");
    attendanceRef = snaps.docs[0].ref;
  }

  const now = new Date();
  const checkOutTimeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const snap = await getDoc(attendanceRef);
  if (!snap.exists()) throw new Error("Attendance record not found");

  const data = snap.data() as any;
  const checkInTimeStr: string | undefined = data.checkInTime;
  const dateStr: string = data.date || new Date().toISOString().split("T")[0];

  let workedMinutes: number | undefined;
  try {
    const start = new Date(`${dateStr} ${checkInTimeStr}`);
    if (!isNaN(start.getTime())) {
      workedMinutes = Math.round(
        (now.getTime() - start.getTime()) / (1000 * 60),
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
    updatedAt: serverTimestamp(),
  };

  if (opts?.location) payload.checkoutLocation = opts.location;
  if (typeof opts?.verifyLocation === "boolean")
    payload.checkoutLocationVerified = !!opts.verifyLocation;
  if (typeof workedMinutes === "number") payload.workedMinutes = workedMinutes;
  if (typeof overtimeMinutes === "number")
    payload.overtimeMinutes = overtimeMinutes;

  await updateDoc(attendanceRef, payload);
}

export async function getTodayAttendance(
  userId: string,
  orgId?: string,
): Promise<AttendanceRecord | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const qConstraints: QueryConstraint[] = [
    where("userId", "==", userId),
    where("timestamp", ">=", Timestamp.fromDate(today)),
    where("timestamp", "<", Timestamp.fromDate(tomorrow)),
    orderBy("timestamp", "desc"),
    limit(1),
  ];

  if (orgId) qConstraints.unshift(where("organizationId", "==", orgId));

  const q = query(collection(db, "attendance"), ...qConstraints);
  const snaps = await getDocs(q);
  if (snaps.empty) return null;
  const d = snaps.docs[0];
  const data = d.data();
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
  } as AttendanceRecord;
}

export async function getAttendanceHistory(
  userId: string,
  limitRecords = 100,
): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, "attendance"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(limitRecords),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(
    (d) => ({ id: d.id, ...(d.data() as any) }) as AttendanceRecord,
  );
}

export async function updateUserProfile(
  uid: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (!uid) throw new Error("User id is required");

  const userRef = doc(db, "users", uid);
  const payload = {
    ...patch,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userRef, payload);
}

/**
 * getAttendanceStats
 * Simple client-side aggregator for dashboard stats.
 * Returns daysPresent, totalWorkingDays (current month), attendanceRate (percentage).
 */
export async function getAttendanceStats(userId: string) {
  const history = await getAttendanceHistory(userId, 1000);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPresent = history.filter((r) => {
    if (!r.date) return false;
    try {
      const d = new Date(r.date);
      return (
        d.getMonth() === month &&
        (r.status === "present" || r.status === "late")
      );
    } catch {
      return false;
    }
  }).length;
  const attendanceRate =
    daysInMonth === 0 ? 0 : Math.round((daysPresent / daysInMonth) * 100);
  return { daysPresent, totalWorkingDays: daysInMonth, attendanceRate };
}
