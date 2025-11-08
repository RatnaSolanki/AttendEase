import { AttendanceRecord } from "@/lib/firebase/attendance";

export type View = "dashboard" | "history" | "profile";

export interface AttendanceStats {
  daysPresent: number;
  totalWorkingDays: number;
  attendanceRate: number;
}

export interface LocationDialogState {
  isOpen: boolean;
  status: "idle" | "requesting" | "verifying" | "success" | "error";
  message: string;
}

export { type AttendanceRecord };
