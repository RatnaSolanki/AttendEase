"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import {
  UserProfile,
  Organization,
  validateSession,
  loginUser,
  logoutUser,
  signupAdmin,
  signupEmployee,
} from "@/lib/firebase/userManagement";
import { toast } from "sonner";

// CONTEXT TYPES

interface AuthContextType {
  // User state
  user: UserProfile | null;
  organization: Organization | null;
  firebaseUser: FirebaseUser | null;

  // Loading states
  loading: boolean;
  initializing: boolean;

  // Auth functions
  login: (
    email: string,
    password: string,
    role?: "admin" | "employee",
  ) => Promise<void>;
  logout: () => Promise<void>;
  signupAsAdmin: (
    name: string,
    email: string,
    password: string,
    orgName: string,
  ) => Promise<void>;
  signupAsEmployee: (
    name: string,
    email: string,
    password: string,
    organizationName: string,
    dept?: string,
  ) => Promise<void>;

  // Helper functions
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AUTH PROVIDER COMPONENT

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  // State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sessionCheckAttempts, setSessionCheckAttempts] = useState(0);

  // SESSION MANAGEMENT - Auto-refresh on page reload

  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isSubscribed) return;

      console.log("🔄 Auth state changed:", firebaseUser?.email || "No user");

      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // User is signed in - Validate session with retry logic
        console.log("📋 Firebase user detected, validating session...");

        try {
          // Add small delay to ensure Firestore write has completed
          await new Promise((resolve) => setTimeout(resolve, 500));

          const validation = await validateSession(firebaseUser);

          if (!isSubscribed) return;

          if (
            validation.isValid &&
            validation.user &&
            validation.organization
          ) {
            console.log("✅ Session validated:", {
              user: validation.user.email,
              role: validation.user.role,
              org: validation.organization.name,
            });

            setUser(validation.user);
            setOrganization(validation.organization);
            setSessionCheckAttempts(0);

            // Auto-redirect after session validation
            const currentPath = window.location.pathname;
            console.log("📍 Current path:", currentPath);

            // If user is on login/signup page, redirect to their dashboard
            if (
              currentPath === "/login" ||
              currentPath === "/signup" ||
              currentPath === "/"
            ) {
              const dashboardPath =
                validation.user.role === "admin" ? "/admin" : "/employee";
              console.log("→ Auto-redirecting to:", dashboardPath);
              router.push(dashboardPath);
            }
          } else {
            console.error("❌ Session validation failed:", validation.message);
            console.error("   Failed at:", validation.step);

            // Retry logic for new signups (profile might not be ready yet)
            if (
              validation.step === "Profile Check" &&
              sessionCheckAttempts < 3
            ) {
              console.log("🔄 Retrying session validation...");
              setSessionCheckAttempts((prev) => prev + 1);

              // Retry after 1 second
              setTimeout(async () => {
                const retryValidation = await validateSession(firebaseUser);
                if (
                  retryValidation.isValid &&
                  retryValidation.user &&
                  retryValidation.organization
                ) {
                  setUser(retryValidation.user);
                  setOrganization(retryValidation.organization);
                  setSessionCheckAttempts(0);

                  const dashboardPath =
                    retryValidation.user.role === "admin"
                      ? "/admin"
                      : "/employee";
                  router.push(dashboardPath);
                }
              }, 1000);

              return; // Don't sign out yet
            }

            // Clear invalid session after retries exhausted
            await auth.signOut();
            setUser(null);
            setOrganization(null);
            setSessionCheckAttempts(0);

            toast.error(
              "Session validation failed. Please try logging in again.",
            );
          }
        } catch (error) {
          console.error("❌ Session validation error:", error);

          if (isSubscribed) {
            // Don't sign out on first error, user might be mid-signup
            if (sessionCheckAttempts === 0) {
              setSessionCheckAttempts(1);
              return;
            }

            await auth.signOut();
            setUser(null);
            setOrganization(null);
            toast.error("Session error. Please login again.");
          }
        }
      } else {
        // User is signed out
        console.log("👋 User signed out, clearing state");
        if (isSubscribed) {
          setUser(null);
          setOrganization(null);
          setSessionCheckAttempts(0);
        }
      }

      if (isSubscribed) {
        setInitializing(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [router, sessionCheckAttempts]);

  // LOGIN FUNCTION

  const login = async (
    email: string,
    password: string,
    expectedRole?: "admin" | "employee",
  ): Promise<void> => {
    setLoading(true);

    try {
      console.log("🔑 Starting login for:", email);
      console.log("   Expected role:", expectedRole || "any");

      // Validate input
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Trim email to avoid whitespace issues
      const trimmedEmail = email.trim().toLowerCase();

      // Call 6-layer validation login
      const userProfile = await loginUser(trimmedEmail, password, expectedRole);

      console.log("✅ Login successful:", {
        email: userProfile.email,
        role: userProfile.role,
        orgId: userProfile.orgID,
      });

      toast.success("Login successful!");

      // onAuthStateChanged will handle the redirect
    } catch (error: any) {
      console.error("❌ Login failed:", error);

      // User-friendly error messages
      let errorMessage = "Login failed. Please try again.";

      if (error.message.includes("Invalid email or password")) {
        errorMessage = "Invalid email or password";
      } else if (error.message.includes("No account found")) {
        errorMessage = "No account found with this email";
      } else if (error.message.includes("Too many failed attempts")) {
        errorMessage = "Too many attempts. Please try again later";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT FUNCTION

  const logout = async (): Promise<void> => {
    setLoading(true);

    try {
      console.log("🚪 Logging out user:", user?.email);

      await logoutUser();

      setUser(null);
      setOrganization(null);
      setFirebaseUser(null);

      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error: any) {
      console.error("❌ Logout failed:", error);
      toast.error("Failed to logout");
    } finally {
      setLoading(false);
    }
  };

  // SIGNUP FUNCTIONS

  const signupAsAdmin = async (
    name: string,
    email: string,
    password: string,
    organizationName: string,
  ): Promise<void> => {
    setLoading(true);

    try {
      console.log("👔 Admin signup:", { email, organizationName });

      // Validate input
      if (!name?.trim()) {
        throw new Error("Name is required");
      }
      if (!email?.trim()) {
        throw new Error("Email is required");
      }
      if (!password) {
        throw new Error("Password is required");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (!organizationName?.trim()) {
        throw new Error("Organization name is required");
      }

      // Trim inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      const trimmedOrgName = organizationName.trim();

      const { user: userProfile, organization: org } = await signupAdmin(
        trimmedName,
        trimmedEmail,
        password,
        trimmedOrgName,
      );

      console.log("✅ Admin account created:", {
        user: userProfile.email,
        org: org.name,
        orgCode: org.orgID,
      });

      toast.success(`Account created! Welcome to ${org.name}`);

      // onAuthStateChanged will handle redirect
    } catch (error: any) {
      console.error("❌ Admin signup failed:", error);

      let errorMessage = "Signup failed. Please try again.";

      if (error.message.includes("email is already registered")) {
        errorMessage = "This email is already registered";
      } else if (
        error.message.includes("organization with this name already exists")
      ) {
        errorMessage = "An organization with this name already exists";
      } else if (
        error.message.includes("Password should be at least 6 characters")
      ) {
        errorMessage = "Password must be at least 6 characters";
      } else if (error.message.includes("Invalid email")) {
        errorMessage = "Invalid email address";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signupAsEmployee = async (
    name: string,
    email: string,
    password: string,
    organizationName: string,
    department?: string,
  ): Promise<void> => {
    setLoading(true);

    try {
      console.log("👤 Employee signup:", { email, organizationName });

      // Validate input
      if (!name?.trim()) {
        throw new Error("Name is required");
      }
      if (!email?.trim()) {
        throw new Error("Email is required");
      }
      if (!password) {
        throw new Error("Password is required");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (!organizationName?.trim()) {
        throw new Error("Organization name is required");
      }

      // Trim inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();
      const trimmedOrgName = organizationName.trim();
      const trimmedDept = department?.trim();

      const userProfile = await signupEmployee(
        trimmedName,
        trimmedEmail,
        password,
        trimmedOrgName,
        trimmedDept,
      );

      console.log("✅ Employee account created:", {
        user: userProfile.email,
        orgId: userProfile.orgID,
      });

      toast.success("Account created successfully!");

      // onAuthStateChanged will handle redirect
    } catch (error: any) {
      console.error("❌ Employee signup failed:", error);

      let errorMessage = "Signup failed. Please try again.";

      if (error.message.includes("email is already registered")) {
        errorMessage = "This email is already registered";
      } else if (error.message.includes("Organization not found")) {
        errorMessage =
          "Organization not found. Please check the name or contact your admin";
      } else if (
        error.message.includes("Password should be at least 6 characters")
      ) {
        errorMessage = "Password must be at least 6 characters";
      } else if (error.message.includes("Invalid email")) {
        errorMessage = "Invalid email address";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // HELPER FUNCTIONS
  const refreshUser = useCallback(async (): Promise<void> => {
    if (firebaseUser) {
      try {
        const validation = await validateSession(firebaseUser);

        if (validation.isValid && validation.user && validation.organization) {
          setUser(validation.user);
          setOrganization(validation.organization);
        }
      } catch (error) {
        console.error("Failed to refresh user:", error);
      }
    }
  }, [firebaseUser]);

  // CONTEXT VALUE

  const value: AuthContextType = {
    user,
    organization,
    firebaseUser,
    loading,
    initializing,
    login,
    logout,
    signupAsAdmin,
    signupAsEmployee,
    refreshUser,
    isAdmin: user?.role === "admin",
    isEmployee: user?.role === "employee",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// CUSTOM HOOK

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// UTILITY COMPONENTS

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="text-center">
        <div className="h-16 w-16 mx-auto mb-4 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: "admin" | "employee";
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { user, initializing, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initializing && !loading) {
      if (!user) {
        console.log("🚫 No user, redirecting to login");
        router.push("/login");
      } else if (requireRole && user.role !== requireRole) {
        console.log("🚫 Wrong role, redirecting to appropriate dashboard");
        const dashboardPath = user.role === "admin" ? "/admin" : "/employee";
        toast.error(`Access denied. Redirecting to ${user.role} dashboard.`);
        router.push(dashboardPath);
      }
    }
  }, [user, initializing, loading, requireRole, router]);

  if (initializing || loading) {
    return <AuthLoadingScreen />;
  }

  if (!user || (requireRole && user.role !== requireRole)) {
    return null;
  }

  return <>{children}</>;
}
