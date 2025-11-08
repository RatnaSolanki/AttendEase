// lib/firebase/admin.ts - COMPLETE FIXED VERSION

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./config";

// ============================================
// TYPES
// ============================================

export interface Employee {
  uid: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  department?: string;
  role: string;
  organizationId: string;
  orgID?: string;
  createdAt?: any;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "present" | "absent" | "late";
  location?: { latitude: number; longitude: number };
  verified: boolean;
}

export interface OrganizationData {
  id: string;
  name: string;
  orgID: string;
  officeLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

/**
 * NormalizedActivity:
 * The summary.recentActivity entries returned by getTodayAttendanceSummary
 * should include these normalized fields so the UI can rely on them.
 */
export interface NormalizedActivity {
  userName: string;
  userEmail?: string;
  userId: string;
  status?: string;
  // Normalized timestamps / times
  checkInISO?: string | null; // ISO string (preferred)
  checkOutISO?: string | null; // ISO string (preferred)
  checkInTime?: string | null; // human formatted time
  checkOutTime?: string | null; // human formatted time
  // Computed fields
  isCheckedOut?: boolean;
  workedMinutes?: number | null;
  // Keep original doc for debugging if desired
  original?: any;
}

/**
 * AttendanceSummary used by UI/dashboard
 */
interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  // recentActivity now holds NormalizedActivity objects
  recentActivity: NormalizedActivity[];
}
// ============================================
// HELPER FUNCTIONS
// ============================================

async function getAdminDoc(adminUid: string) {
  try {
    // Try direct lookup first
    const directRef = doc(db, "users", adminUid);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      return { id: directSnap.id, data: directSnap.data() as any };
    }

    // Fallback: query by uid field
    const adminQuery = query(
      collection(db, "users"),
      where("uid", "==", adminUid),
    );
    const adminSnapshot = await getDocs(adminQuery);
    if (!adminSnapshot.empty) {
      const d = adminSnapshot.docs[0];
      return { id: d.id, data: d.data() as any };
    }

    return null;
  } catch (err) {
    console.error("Error getting admin doc:", err);
    return null;
  }
}

function getOrgId(adminData: any): string | null {
  return adminData.organizationId || adminData.orgID || adminData.orgId || null;
}

// ============================================
// EMPLOYEES
// ============================================

export async function getOrganizationEmployees(
  adminUid: string,
): Promise<Employee[]> {
  try {
    console.log("🔍 Fetching employees for admin:", adminUid);

    const adminDoc = await getAdminDoc(adminUid);
    if (!adminDoc) {
      console.error(" Admin user not found");
      return [];
    }

    const organizationId = getOrgId(adminDoc.data);
    if (!organizationId) {
      console.error("Admin has no organization");
      return [];
    }

    console.log("Organization ID:", organizationId);

    // Query by organizationId OR orgID
    const employeesRef = collection(db, "users");

    // Try both field names
    const queries = [
      query(employeesRef, where("organizationId", "==", organizationId)),
      query(employeesRef, where("orgID", "==", organizationId)),
    ];

    const results = await Promise.all(
      queries.map((q) => getDocs(q).catch(() => ({ docs: [] }))),
    );

    // Combine and deduplicate
    const allDocs = new Map();
    results.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        if (!allDocs.has(doc.id)) {
          allDocs.set(doc.id, doc);
        }
      });
    });

    const employees: Employee[] = Array.from(allDocs.values()).map((d) => {
      const data = d.data() as any;
      const firstName = data.firstName || "";
      const lastName = data.lastName || "";
      const name =
        data.name ||
        (firstName || lastName
          ? `${firstName} ${lastName}`.trim()
          : data.email) ||
        "Unknown";

      return {
        uid: data.uid || d.id,
        firstName,
        lastName,
        name,
        email: data.email || "",
        department: data.department || "",
        role: data.role || "employee",
        organizationId: data.organizationId || data.orgID || organizationId,
        orgID: data.orgID || data.organizationId || organizationId,
        createdAt: data.createdAt,
      };
    });

    console.log("✅ Found employees:", employees.length);
    return employees;
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    return [];
  }
}

export async function addEmployee(
  adminUid: string,
  employeeData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    department?: string;
  },
): Promise<Employee> {
  try {
    const adminDoc = await getAdminDoc(adminUid);
    if (!adminDoc) throw new Error("Admin user not found");

    const organizationId = getOrgId(adminDoc.data);
    if (!organizationId) throw new Error("Admin has no organization");

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      employeeData.email,
      employeeData.password,
    );

    const newEmployee: Employee = {
      uid: userCredential.user.uid,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      name: `${employeeData.firstName} ${employeeData.lastName}`.trim(),
      email: employeeData.email,
      department: employeeData.department || "",
      role: "employee",
      organizationId: organizationId,
      orgID: organizationId,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", newEmployee.uid), newEmployee);

    return newEmployee;
  } catch (error: any) {
    console.error("Error adding employee:", error);
    if (error.code === "auth/email-already-in-use") {
      throw new Error("An employee with this email already exists");
    }
    throw error;
  }
}

export async function deleteEmployee(employeeUid: string): Promise<void> {
  try {
    const userRef = doc(db, "users", employeeUid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      await deleteDoc(userRef);
    } else {
      const userQuery = query(
        collection(db, "users"),
        where("uid", "==", employeeUid),
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) await deleteDoc(userSnapshot.docs[0].ref);
    }

    // Delete attendance records
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("userID", "==", employeeUid),
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    const deletePromises = attendanceSnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting employee:", error);
    throw error;
  }
}

// ============================================
// ATTENDANCE SUMMARY
// ============================================

export async function getTodayAttendanceSummary(
  adminUid: string,
): Promise<AttendanceSummary> {
  try {
    console.log("📊 Fetching attendance summary for admin:", adminUid);

    const employees = await getOrganizationEmployees(adminUid);

    if (employees.length === 0) {
      console.log("⚠️ No employees found");
      return { present: 0, absent: 0, late: 0, recentActivity: [] };
    }

    console.log("👥 Total employees:", employees.length);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Get all attendance for today
    const attendanceRef = collection(db, "attendance");
    const todayQuery = query(
      attendanceRef,
      where("date", "==", today),
      orderBy("timestamp", "desc"),
    );

    const attendanceSnapshot = await getDocs(todayQuery);
    console.log("📋 Total attendance records today:", attendanceSnapshot.size);

    // Create a map of employee UIDs for quick lookup
    const employeeMap = new Map(employees.map((e) => [e.uid, e]));

    const checkedInEmployees = new Set<string>();
    const recentActivity: AttendanceSummary["recentActivity"] = [];

    // helper: normalize various timestamp/value types to ISO string or null
    const normalizeToISO = (v: any): string | null => {
      if (v == null) return null;
      // Firestore Timestamp
      if (typeof v === "object" && typeof v.toDate === "function") {
        const d = v.toDate();
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
      // numeric seconds or ms
      if (typeof v === "number") {
        const ms = v > 1e12 ? v : v * 1000;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
      // string
      try {
        const d = new Date(String(v));
        return isNaN(d.getTime()) ? null : d.toISOString();
      } catch {
        return null;
      }
    };

    const formatTimeFromISO = (iso: string | null): string | null => {
      if (!iso) return null;
      try {
        const d = new Date(iso);
        return isNaN(d.getTime())
          ? null
          : d.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
      } catch {
        return null;
      }
    };

    // iterate attendance docs
    attendanceSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const userId = data.userID || data.userId || data.uid || "";
      if (!userId) return;

      // Only include if this employee belongs to our organization
      if (!employeeMap.has(userId)) return;

      // mark checked-in (we will refine checked-out later)
      checkedInEmployees.add(userId);

      const employee = employeeMap.get(userId)!;

      // possible sources for check-in/out (try many variants)
      const possibleCheckInSources = [
        data.checkInISO,
        data.checkInTimestamp,
        data.checkInAt,
        data.check_in_iso,
        data.check_in_timestamp,
        data.check_in_at,
        data.checkIn,
        data.check_in,
        data.timestamp, // often the doc timestamp is check-in
        data.timestamp?.toDate?.() ?? null,
      ];

      const possibleCheckOutSources = [
        data.checkOutISO,
        data.checkOutTimestamp,
        data.checkOutAt,
        data.check_out_iso,
        data.check_out_timestamp,
        data.check_out_at,
        data.checkOut,
        data.check_out,
        data.checkout,
        data.checkoutAt,
        data.checkoutTimestamp,
        data.checkout_ts,
        data.checked_out_at,
        data.check_out_time,
        data.checkOutTime,
        data.checkOutFormatted,
      ];

      // select first non-null
      const pickFirst = (arr: any[]) => {
        for (const v of arr) {
          if (v !== undefined && v !== null && String(v).trim() !== "")
            return v;
        }
        return null;
      };

      const rawCheckIn = pickFirst(possibleCheckInSources);
      const rawCheckOut = pickFirst(possibleCheckOutSources);

      // Normalize to ISO when possible
      const checkInISO = normalizeToISO(rawCheckIn) || null;
      const checkOutISO = normalizeToISO(rawCheckOut) || null;

      // formatted times - prefer explicit formatted fields, then ISO formatting
      const checkInTime =
        data.checkInTime ??
        data.checkInFormatted ??
        (checkInISO ? formatTimeFromISO(checkInISO) : null) ??
        null;

      const checkOutTime =
        data.checkOutTime ??
        data.checkOutFormatted ??
        (checkOutISO ? formatTimeFromISO(checkOutISO) : null) ??
        null;

      // explicit boolean flags
      const explicitCheckedOut =
        data.isCheckedOut === true ||
        data.checkedOut === true ||
        data.hasCheckedOut === true;

      // If any checkout-like value exists, consider this checked out.
      const isCheckedOut =
        Boolean(checkOutISO) ||
        (typeof checkOutTime === "string" && checkOutTime.trim() !== "") ||
        explicitCheckedOut;

      // compute worked minutes when possible
      let workedMinutes: number | null = null;
      if (checkInISO && checkOutISO) {
        const s = new Date(checkInISO);
        const e = new Date(checkOutISO);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          workedMinutes = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
        }
      } else if (checkInISO && !checkOutISO && checkOutTime) {
        // best-effort parse using checkIn date and checkOutTime string
        try {
          const datePart = new Date(checkInISO).toISOString().split("T")[0]; // YYYY-MM-DD
          const parsed = new Date(`${datePart} ${checkOutTime}`);
          if (!isNaN(parsed.getTime())) {
            const s = new Date(checkInISO);
            workedMinutes = Math.round(
              (parsed.getTime() - s.getTime()) / (1000 * 60),
            );
          }
        } catch {
          workedMinutes = null;
        }
      }

      // status and timestamp fallback
      const status = data.status ?? "present";
      const fallbackTimestamp = data.timestamp?.toDate
        ? data.timestamp.toDate()
        : data.timestamp
          ? new Date(data.timestamp)
          : new Date();
      const fallbackCheckInTime =
        checkInTime ||
        (fallbackTimestamp
          ? fallbackTimestamp.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null);

      recentActivity.push({
        userName: employee.name,
        userEmail: employee.email,
        checkInTime: fallbackCheckInTime,
        checkOutTime: checkOutTime ?? null,
        checkInISO,
        checkOutISO,
        userId,
        status,
        isCheckedOut,
        workedMinutes,
      });
    });

    const presentCount = checkedInEmployees.size;
    const absentCount = Math.max(0, employees.length - presentCount);

    // Calculate late count (after 9:30 AM) using timestamp fields if available
    const lateThreshold = new Date();
    lateThreshold.setHours(9, 30, 0, 0);
    const lateCount = attendanceSnapshot.docs.filter((docSnap) => {
      const d = docSnap.data() as any;
      const ts =
        d.timestamp?.toDate?.() ?? (d.timestamp ? new Date(d.timestamp) : null);
      return ts && ts > lateThreshold;
    }).length;

    console.log("✅ Summary:", {
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      recentActivity: recentActivity.length,
    });

    return {
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      recentActivity: recentActivity
        .sort((a, b) => {
          const ta = a.checkInISO ? new Date(a.checkInISO).getTime() : 0;
          const tb = b.checkInISO ? new Date(b.checkInISO).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 10),
    };
  } catch (error) {
    console.error("❌ Error fetching attendance summary:", error);
    return { present: 0, absent: 0, late: 0, recentActivity: [] };
  }
}
// ============================================
// ATTENDANCE LOGS
// ============================================

export async function getAttendanceLogs(
  adminUid: string,
): Promise<AttendanceLog[]> {
  try {
    const employees = await getOrganizationEmployees(adminUid);
    if (employees.length === 0) return [];

    const attendanceQuery = query(
      collection(db, "attendance"),
      orderBy("timestamp", "desc"),
      limit(100),
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const employeeMap = new Map(employees.map((e) => [e.uid, e]));

    const logs: AttendanceLog[] = [];

    attendanceSnapshot.docs.forEach((d) => {
      const data = d.data() as any;
      const userId = data.userID || data.userId || "";
      const employee = employeeMap.get(userId);

      // Only include if employee belongs to our org
      if (employee) {
        const timestamp = data.timestamp?.toDate() || new Date();

        logs.push({
          id: d.id,
          userId,
          userName: employee.name,
          date: data.date || timestamp.toISOString().split("T")[0],
          checkInTime:
            data.checkInTime ||
            timestamp.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          checkOutTime: data.checkOutTime,
          status: data.status || "present",
          location: data.location || data.coordinates,
          verified: data.locationVerified || false,
        });
      }
    });

    return logs;
  } catch (error) {
    console.error("Error fetching attendance logs:", error);
    return [];
  }
}

export async function verifyAttendance(logId: string): Promise<void> {
  try {
    const attendanceRef = doc(db, "attendance", logId);
    await updateDoc(attendanceRef, { locationVerified: true });
  } catch (error) {
    console.error("Error verifying attendance:", error);
    throw error;
  }
}

// ============================================
// ORGANIZATION
// ============================================

export async function getOrganizationData(
  adminUid: string,
): Promise<OrganizationData> {
  try {
    const adminDoc = await getAdminDoc(adminUid);
    if (!adminDoc) throw new Error("Admin user not found");

    const organizationId = getOrgId(adminDoc.data);
    if (!organizationId) throw new Error("Admin has no organization");

    const orgDocRef = doc(db, "organizations", organizationId);
    const orgSnap = await getDoc(orgDocRef);

    if (!orgSnap.exists()) {
      return {
        id: organizationId,
        orgID: organizationId,
        name: "My Organization",
        officeLocation: {
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
        },
      };
    }

    const orgData = orgSnap.data() as any;
    return {
      id: orgSnap.id,
      orgID: orgData.orgID || orgSnap.id,
      name: orgData.name || "My Organization",
      officeLocation: orgData.officeLocation || {
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
      },
    };
  } catch (error) {
    console.error("Error fetching organization data:", error);
    throw error;
  }
}

export async function updateOrganizationLocation(
  adminUid: string,
  latitude: number,
  longitude: number,
  radius: number,
): Promise<OrganizationData> {
  try {
    if (latitude < -90 || latitude > 90)
      throw new Error("Latitude must be between -90 and 90");
    if (longitude < -180 || longitude > 180)
      throw new Error("Longitude must be between -180 and 180");
    if (radius < 10 || radius > 1000)
      throw new Error("Radius must be between 10 and 1000 meters");

    const adminDoc = await getAdminDoc(adminUid);
    if (!adminDoc) throw new Error("Admin user not found");

    const organizationId = getOrgId(adminDoc.data);
    const orgRef = doc(db, "organizations", organizationId!);

    await updateDoc(orgRef, {
      officeLocation: { latitude, longitude, radius },
    });

    return await getOrganizationData(adminUid);
  } catch (error) {
    console.error("Error updating organization location:", error);
    throw error;
  }
}

// ============================================
// REPORTS
// ============================================

export async function generateReport(
  adminUid: string,
  reportType: "daily" | "weekly" | "monthly",
  startDate: string,
  endDate: string,
) {
  try {
    const employees = await getOrganizationEmployees(adminUid);
    if (employees.length === 0) return [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("timestamp", ">=", Timestamp.fromDate(start)),
      where("timestamp", "<=", Timestamp.fromDate(end)),
      orderBy("timestamp", "desc"),
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    const employeeMap = new Map(employees.map((e) => [e.uid, e]));

    const reportData: any[] = attendanceSnapshot.docs
      .map((d) => {
        const data = d.data() as any;
        const userId = data.userID || data.userId || "";
        const employee = employeeMap.get(userId);

        if (!employee) return null;

        const timestamp = data.timestamp?.toDate() || new Date();

        return {
          EmployeeName: employee.name,
          Email: employee.email,
          Department: employee.department || "N/A",
          Date: timestamp.toISOString().split("T")[0],
          CheckIn:
            data.checkInTime ||
            timestamp.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          CheckOut: data.checkOutTime || "N/A",
          Status: data.status || "present",
          Verified: data.locationVerified ? "Yes" : "No",
          Location: data.location
            ? `${data.location.latitude}, ${data.location.longitude}`
            : "N/A",
        };
      })
      .filter((item) => item !== null);

    return reportData;
  } catch (error) {
    console.error("Error generating report:", error);
    throw error;
  }
}
