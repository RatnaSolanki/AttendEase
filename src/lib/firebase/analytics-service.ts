import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "./config";

export interface TodayStats {
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  totalEmployees: number;
  presentPercentage: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  absent: number;
  leave: number;
}

export interface DepartmentStats {
  department: string;
  present: number;
  total: number;
  percentage: number;
}

// ✅ HELPER: Get local date string consistently
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ✅ Get Today's Statistics (Optimized)
export async function getTodayStats(organizationId: string): Promise<TodayStats> {
  const todayStr = getLocalDateString();

  console.log("📊 getTodayStats - Org:", organizationId, "Date:", todayStr);

  // Query only by organizationId
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("organizationId", "==", organizationId)
  );

  const attendanceSnapshot = await getDocs(attendanceQuery);
  
  console.log("📊 Total attendance records:", attendanceSnapshot.size);
  
  // Filter by date in JavaScript
  const todayRecords = attendanceSnapshot.docs
    .map(doc => doc.data())
    .filter(record => {
      console.log("🔍 Record date:", record.date, "vs Today:", todayStr);
      return record.date === todayStr;
    });

  console.log("📊 Today's records:", todayRecords.length);

  // Get total employees count
  const usersQuery = query(
    collection(db, "users"),
    where("organizationId", "==", organizationId),
    where("role", "==", "employee")
  );
  const usersSnapshot = await getDocs(usersQuery);
  const totalEmployees = usersSnapshot.size;

  console.log("👥 Total employees:", totalEmployees);

  // Calculate stats
  const presentRecords = todayRecords.filter(r => r.status === "present");
  const present = presentRecords.length;
  const onLeave = todayRecords.filter(r => r.status === "leave").length;
  
  // Absent = employees who haven't checked in yet
  const checkedInUsers = new Set(todayRecords.map(r => r.userId));
  const absent = totalEmployees - checkedInUsers.size;

  // Late = checked in after 9:30 AM
  const late = presentRecords.filter(r => {
    if (!r.checkInTime) return false;
    const [hours, minutes] = r.checkInTime.split(":").map(Number);
    return hours > 9 || (hours === 9 && minutes > 30);
  }).length;

  const presentPercentage = totalEmployees > 0 
    ? Math.round((present / totalEmployees) * 100) 
    : 0;

  console.log("✅ Stats:", { present, absent, onLeave, late, presentPercentage });

  return {
    present,
    absent,
    onLeave,
    late,
    totalEmployees,
    presentPercentage,
  };
}

// ✅ Get 7-day Attendance Trend (Optimized with local dates)
export async function getAttendanceTrend(
  organizationId: string,
  days: number = 7
): Promise<AttendanceTrendPoint[]> {
  console.log("📈 getAttendanceTrend - Org:", organizationId, "Days:", days);

  const trend: AttendanceTrendPoint[] = [];
  const today = new Date();

  // Get all attendance records for the organization
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("organizationId", "==", organizationId)
  );

  const snapshot = await getDocs(attendanceQuery);
  const allRecords = snapshot.docs.map(doc => doc.data());

  console.log("📈 Total records fetched:", allRecords.length);

  // Process data for each day
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getLocalDateString(date);

    // Filter records for this specific date
    const dayRecords = allRecords.filter(r => r.date === dateStr);

    console.log(`📈 ${dateStr}: ${dayRecords.length} records`);

    trend.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      present: dayRecords.filter(r => r.status === "present").length,
      absent: dayRecords.filter(r => r.status === "absent").length,
      leave: dayRecords.filter(r => r.status === "leave").length,
    });
  }

  console.log("✅ Trend data:", trend);

  return trend;
}

// ✅ Get Department-wise Statistics (Optimized)
export async function getDepartmentStats(organizationId: string): Promise<DepartmentStats[]> {
  const todayStr = getLocalDateString();

  console.log("🏢 getDepartmentStats - Org:", organizationId, "Date:", todayStr);

  // Get all users with departments
  const usersQuery = query(
    collection(db, "users"),
    where("organizationId", "==", organizationId),
    where("role", "==", "employee")
  );
  const usersSnapshot = await getDocs(usersQuery);
  const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log("🏢 Total users:", users.length);

  // Get all attendance records for organization
  const attendanceQuery = query(
    collection(db, "attendance"),
    where("organizationId", "==", organizationId)
  );
  const attendanceSnapshot = await getDocs(attendanceQuery);
  
  // Filter today's attendance in JavaScript
  const todayAttendance = attendanceSnapshot.docs
    .map(doc => doc.data())
    .filter(record => record.date === todayStr);

  console.log("🏢 Today's attendance records:", todayAttendance.length);

  // Group by department
  const deptMap = new Map<string, { present: number; total: number }>();

  users.forEach((user: any) => {
    const dept = user.department || "Unassigned";
    if (!deptMap.has(dept)) {
      deptMap.set(dept, { present: 0, total: 0 });
    }
    const stats = deptMap.get(dept)!;
    stats.total++;

    // Check if user has present status today
    const hasAttendance = todayAttendance.some(
      a => a.userId === user.id && a.status === "present"
    );
    if (hasAttendance) {
      stats.present++;
    }
  });

  console.log("🏢 Department map:", Array.from(deptMap.entries()));

  // Convert to array and sort by department name
  const result = Array.from(deptMap.entries())
    .map(([department, stats]) => ({
      department,
      present: stats.present,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
    }))
    .sort((a, b) => a.department.localeCompare(b.department));

  console.log("✅ Department stats:", result);

  return result;
}