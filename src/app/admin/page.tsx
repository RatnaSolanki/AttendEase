"use client";

import { ProtectedRoute } from "@/context/AuthContext";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export default function AdminPage() {
  return (
    <ProtectedRoute requireRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
