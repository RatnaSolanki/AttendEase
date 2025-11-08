export type UserRole = "admin" | "employee";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  orgID: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  department: string;
  role: UserRole;
  organizationName?: string;
}

export interface LoginData {
  email: string;
  password: string;
  remember: boolean;
}
