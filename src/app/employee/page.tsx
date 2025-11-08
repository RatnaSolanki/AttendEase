"use client";

import { ProtectedRoute } from "@/context/AuthContext";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";

export default function EmployeePage() {
  return (
    <ProtectedRoute requireRole="employee">
      <EmployeeDashboard />
    </ProtectedRoute>
  );
}
