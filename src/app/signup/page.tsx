"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/employee");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <main className="flex flex-1 items-center justify-center p-4">
        <SignUpForm
          onBack={() => window.history.back()}
          onSwitchToLogin={() => router.push("/login")}
        />
      </main>
    </div>
  );
}
