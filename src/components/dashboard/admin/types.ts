export type View =
  | "dashboard"
  | "employees"
  | "attendance"
  | "reports"
  | "organization";

export interface Employee {
  uid: string;
  name: string;
  email: string;
  role: "employee";
  organizationId: string;
  department?: string;
  joinedDate: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "present" | "absent" | "late";
  location?: {
    latitude: number;
    longitude: number;
  };
  verified: boolean;
}

export interface OrganizationData {
  id: string;
  name: string;
  officeLocation: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
}
