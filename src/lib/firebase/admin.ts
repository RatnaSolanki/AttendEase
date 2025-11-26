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

export interface NormalizedActivity {
  userName: string;
  userEmail?: string;
  userId: string;
  status?: string;
  checkInISO?: string | null;
  checkOutISO?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  isCheckedOut?: boolean;
  workedMinutes?: number | null;
  shiftMinutes?: number;
  original?: any;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  recentActivity: NormalizedActivity[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function getAdminDoc(adminUid: string) {
  try {
    const directRef = doc(db, "users", adminUid);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      return { id: directSnap.id, data: directSnap.data() as any };
    }

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
// EMPLOYEES (✅ ONLY EMPLOYEES, NO ADMINS)
// ============================================

export async function getOrganizationEmployees(
  adminUid: string,
): Promise<Employee[]> {
  try {
    console.log("🔍 Fetching employees for admin:", adminUid);

    const adminDoc = await getAdminDoc(adminUid);
    if (!adminDoc) {
      console.error("❌ Admin user not found");
      return [];
    }

    const organizationId = getOrgId(adminDoc.data);
    if (!organizationId) {
      console.error("❌ Admin has no organization");
      return [];
    }

    console.log("🏢 Organization ID:", organizationId);

    // ✅ ONLY GET EMPLOYEES (exclude admins)
    const employeesRef = collection(db, "users");
    const queries = [
      query(
        employeesRef,
        where("organizationId", "==", organizationId),
        where("role", "==", "employee")
      ),
      query(
        employeesRef,
        where("orgID", "==", organizationId),
        where("role", "==", "employee")
      ),
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

    console.log("✅ Found employees (excluding admins):", employees.length);
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
      where("userId", "==", employeeUid),
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
// ATTENDANCE SUMMARY (✅ ONLY EMPLOYEES)
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

    console.log("👥 Total employees (excluding admins):", employees.length);

    const todayStr = getLocalDateString();
    console.log("📅 Today's date:", todayStr);

    const adminDoc = await getAdminDoc(adminUid);
    const organizationId = getOrgId(adminDoc?.data);

    const attendanceRef = collection(db, "attendance");
    const todayQuery = query(attendanceRef, where("organizationId", "==", organizationId));

    const attendanceSnapshot = await getDocs(todayQuery);
    console.log("📋 Total attendance records fetched:", attendanceSnapshot.size);

    const todayRecords = attendanceSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((record: any) => record.date === todayStr);

    console.log("📋 Today's attendance records:", todayRecords.length);

    const employeeMap = new Map(employees.map((e) => [e.uid, e]));
    const checkedInEmployees = new Set<string>();
    const recentActivity: NormalizedActivity[] = [];

    const normalizeToISO = (v: any): string | null => {
      if (v == null) return null;
      if (typeof v === "object" && typeof v.toDate === "function") {
        const d = v.toDate();
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
      if (typeof v === "number") {
        const ms = v > 1e12 ? v : v * 1000;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
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
              hour12: true,
            });
      } catch {
        return null;
      }
    };

    todayRecords.forEach((data: any) => {
      const userId = data.userId || data.userID || data.uid || "";
      if (!userId) return;

      if (!employeeMap.has(userId)) return;

      checkedInEmployees.add(userId);
      const employee = employeeMap.get(userId)!;

      const checkInISO = normalizeToISO(data.timestamp || data.checkInISO || data.checkInTimestamp);
      const checkOutISO = normalizeToISO(data.checkOutISO || data.checkOutTimestamp || data.checkoutTimestamp);

      const checkInTime = data.checkInTime || formatTimeFromISO(checkInISO);
      const checkOutTime = data.checkOutTime || formatTimeFromISO(checkOutISO);

      const isCheckedOut = Boolean(checkOutISO || checkOutTime);

      let workedMinutes: number | null = null;
      if (checkInISO && checkOutISO) {
        const s = new Date(checkInISO);
        const e = new Date(checkOutISO);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          workedMinutes = Math.round((e.getTime() - s.getTime()) / (1000 * 60));
        }
      }

      recentActivity.push({
        userName: employee.name,
        userEmail: employee.email,
        userId,
        status: data.status || "present",
        checkInISO,
        checkOutISO,
        checkInTime,
        checkOutTime,
        isCheckedOut,
        workedMinutes,
        shiftMinutes: 540, // 9 hours default
      });
    });

    const presentCount = checkedInEmployees.size;
    const absentCount = Math.max(0, employees.length - presentCount);

    const lateCount = todayRecords.filter((data: any) => {
      if (!data.checkInTime) return false;
      const match = data.checkInTime.match(/(\d{1,2}):(\d{2})/);
      if (!match) return false;
      const [_, hours, minutes] = match.map(Number);
      return hours > 9 || (hours === 9 && minutes > 30);
    }).length;

    console.log("✅ Summary:", {
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      total: employees.length,
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
// ATTENDANCE LOGS (✅ ONLY EMPLOYEES)
// ============================================

export async function getAttendanceLogs(
  adminUid: string,
): Promise<AttendanceLog[]> {
  try {
    console.log("📋 Fetching attendance logs for admin:", adminUid);

    const employees = await getOrganizationEmployees(adminUid);
    if (employees.length === 0) {
      console.log("⚠️ No employees found");
      return [];
    }

    const adminDoc = await getAdminDoc(adminUid);
    const organizationId = getOrgId(adminDoc?.data);

    console.log("🏢 Organization ID:", organizationId);

    const attendanceQuery = query(
      collection(db, "attendance"),
      where("organizationId", "==", organizationId),
      limit(100)
    );

    const attendanceSnapshot = await getDocs(attendanceQuery);
    console.log("📋 Total attendance records fetched:", attendanceSnapshot.size);

    const employeeMap = new Map(employees.map((e) => [e.uid, e]));
    const logs: AttendanceLog[] = [];

    attendanceSnapshot.docs.forEach((d) => {
      const data = d.data() as any;
      const userId = data.userId || data.userID || "";
      const employee = employeeMap.get(userId);

      if (employee) {
        const timestamp = data.timestamp?.toDate() || new Date();

        logs.push({
          id: d.id,
          userId,
          userName: employee.name,
          date: data.date || getLocalDateString(timestamp),
          checkInTime: data.checkInTime ||
            timestamp.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          checkOutTime: data.checkOutTime,
          status: data.status || "present",
          location: data.location || data.coordinates,
          verified: data.locationVerified || data.verified || false,
        });
      }
    });

    logs.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + (a.checkInTime || '00:00'));
      const dateB = new Date(b.date + ' ' + (b.checkInTime || '00:00'));
      return dateB.getTime() - dateA.getTime();
    });

    console.log("✅ Attendance logs fetched:", logs.length);

    return logs.slice(0, 100);
  } catch (error) {
    console.error("❌ Error fetching attendance logs:", error);
    return [];
  }
}

// ✅ ADD THIS FUNCTION (MISSING)
export async function verifyAttendance(logId: string): Promise<void> {
  try {
    console.log("✅ Verifying attendance:", logId);
    const attendanceRef = doc(db, "attendance", logId);
    await updateDoc(attendanceRef, { 
      verified: true, 
      locationVerified: true 
    });
    console.log("✅ Attendance verified successfully");
  } catch (error) {
    console.error("❌ Error verifying attendance:", error);
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
          latitude: 23.0225,
          longitude: 72.5714,
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
        latitude: 23.0225,
        longitude: 72.5714,
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
// REPORTS (✅ ONLY EMPLOYEES)
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
        const userId = data.userId || data.userID || "";
        const employee = employeeMap.get(userId);

        if (!employee) return null;

        const timestamp = data.timestamp?.toDate() || new Date();

        return {
          EmployeeName: employee.name,
          Email: employee.email,
          Department: employee.department || "N/A",
          Date: getLocalDateString(timestamp),
          CheckIn: data.checkInTime ||
            timestamp.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
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