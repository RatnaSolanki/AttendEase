import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  deleteUser,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "./config";

// ---------------- TYPES ----------------

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "employee";
  orgID: string;
  department?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Organization {
  orgID: string;
  name: string;
  ownerId: string;
  members: string[];
  latitude: number;
  longitude: number;
  allowedRadius: number;
  settings?: {
    workingHours: {
      start: string;
      end: string;
    };
    lateThreshold: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  step?: string;
}

// ---------------- UTIL ----------------

function generateOrgID(organizationName: string): string {
  return organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ---------------- ADMIN SIGNUP ----------------

export const signupAdmin = async (
  name: string,
  email: string,
  password: string,
  organizationName: string,
): Promise<{ user: UserProfile; organization: Organization }> => {
  let userCredential: any = null;

  try {
    const orgID = generateOrgID(organizationName);

    // Check if organization already exists
    const orgDoc = await getDoc(doc(db, "organizations", orgID));
    if (orgDoc.exists()) {
      throw new Error(
        "Organization name already exists. Please choose a different name.",
      );
    }

    // Step 1: Create Firebase Auth user
    console.log("🔐 Creating Firebase Auth user...");
    userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const userId = userCredential.user.uid;
    console.log("✅ Firebase Auth user created:", userId);

    // Step 2: Create user profile FIRST (so rules can verify role)
    console.log("👤 Creating user profile...");
    const userProfile: UserProfile = {
      uid: userId,
      name,
      email,
      role: "admin",
      orgID,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", userId), userProfile);
    console.log("✅ User profile created");

    // Step 3: Create organization doc (now rules can verify user is admin)
    console.log("🏢 Creating organization...");
    const organization: Organization = {
      orgID,
      name: organizationName,
      ownerId: userId,
      members: [userId],
      latitude: 0,
      longitude: 0,
      allowedRadius: 100,
      settings: {
        workingHours: { start: "09:00", end: "18:00" },
        lateThreshold: 30,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "organizations", orgID), organization);
    console.log("✅ Organization created");

    console.log("🎉 Admin account created successfully");
    return { user: userProfile, organization };
  } catch (error: any) {
    console.error("❌ Admin signup error:", error);

    // Cleanup orphaned account if failed mid-way
    if (userCredential?.user) {
      try {
        await deleteUser(userCredential.user);
        console.log("🧹 Orphaned admin auth account deleted");
      } catch {
        console.error("⚠️ Failed to delete orphaned admin account");
      }
    }

    if (error.message.includes("Organization name already exists")) throw error;
    if (error.code === "auth/email-already-in-use")
      throw new Error("This email is already registered.");
    if (error.code === "auth/weak-password")
      throw new Error("Password should be at least 6 characters.");

    throw new Error(error.message || "Failed to create admin account");
  }
};

// ---------------- EMPLOYEE SIGNUP ----------------

export const signupEmployee = async (
  name: string,
  email: string,
  password: string,
  organizationName: string,
  department?: string,
): Promise<UserProfile> => {
  let userCredential: any = null;

  try {
    const orgNameNormalized = organizationName.trim().toLowerCase();
    console.log("🔍 Checking for organization:", orgNameNormalized);

    // Query all orgs (case-insensitive match)
    const orgCollection = collection(db, "organizations");
    const orgSnapshot = await getDocs(orgCollection);
    const orgDoc = orgSnapshot.docs.find(
      (doc) => doc.data().name.toLowerCase() === orgNameNormalized,
    );

    if (!orgDoc) {
      throw new Error(
        "Organization not found. Please check the name with your admin.",
      );
    }

    const orgID = orgDoc.id.trim().toLowerCase();
    const organization = orgDoc.data() as Organization;

    console.log("✅ Organization found:", organization.name);

    // Create Firebase Auth account
    console.log("🔐 Creating Firebase Auth user...");
    userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const userId = userCredential.user.uid;
    console.log("✅ Firebase Auth user created:", userId);

    // Create user profile
    console.log("👤 Creating employee profile...");
    const userProfile: UserProfile = {
      uid: userId,
      name,
      email,
      role: "employee",
      orgID,
      department: department || "",
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", userId), userProfile);
    console.log("✅ Employee profile created");

    // Add employee to organization
    console.log("🏢 Adding employee to organization...");
    const orgRef = doc(db, "organizations", orgID);
    await updateDoc(orgRef, {
      members: arrayUnion(userId),
      updatedAt: new Date().toISOString(),
    });

    console.log("✅ Employee added to organization");
    console.log("🎉 Employee account created successfully");

    return userProfile;
  } catch (error: any) {
    console.error("❌ Employee signup error:", error);

    if (userCredential?.user) {
      console.log("🧹 Cleaning up orphaned employee account...");
      try {
        await deleteUser(userCredential.user);
        console.log("✅ Orphaned employee account deleted");
      } catch {
        console.error("⚠️ Failed to delete orphaned employee account");
      }
    }

    if (error.message.includes("Organization not found")) throw error;
    if (error.code === "auth/email-already-in-use")
      throw new Error("This email is already registered.");
    if (error.code === "auth/weak-password")
      throw new Error("Password should be at least 6 characters.");

    throw new Error(error.message || "Failed to create employee account");
  }
};

// ---------------- LOGIN ----------------

export const loginUser = async (
  email: string,
  password: string,
  expectedRole?: "admin" | "employee",
): Promise<UserProfile> => {
  try {
    console.log("🔐 Authenticating with Firebase Auth...");
    // Layer 1: Firebase Auth
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const userId = userCredential.user.uid;
    console.log("✅ Firebase Auth successful");

    // Layer 2: User Profile
    console.log("👤 Fetching user profile...");
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      await firebaseSignOut(auth);
      throw new Error("User profile not found.");
    }

    const userProfile = userDoc.data() as UserProfile;
    console.log("✅ User profile found:", userProfile.email, userProfile.role);

    // Layer 3: Organization Exists
    console.log("🏢 Verifying organization...");
    const orgDoc = await getDoc(doc(db, "organizations", userProfile.orgID));
    if (!orgDoc.exists()) {
      await firebaseSignOut(auth);
      throw new Error("Organization not found.");
    }

    const organization = orgDoc.data() as Organization;
    console.log("✅ Organization verified:", organization.name);

    // Layer 4: Membership
    if (!organization.members.includes(userId)) {
      await firebaseSignOut(auth);
      throw new Error("Membership revoked");
    }
    console.log("✅ Membership verified");

    // Layer 5: Role Match
    if (expectedRole && userProfile.role !== expectedRole) {
      await firebaseSignOut(auth);
      throw new Error(
        `Access denied. This portal is for ${expectedRole}s only.`,
      );
    }
    console.log("✅ Role verified");

    // Update last login
    await updateDoc(doc(db, "users", userId), {
      lastLogin: new Date().toISOString(),
    });

    console.log("🎉 Login successful for", email);
    return userProfile;
  } catch (error: any) {
    console.error("❌ Login error:", error);
    throw new Error(error.message || "Login failed");
  }
};

// ---------------- SESSION VALIDATION ----------------

export const validateSession = async (
  firebaseUser: FirebaseUser,
): Promise<
  ValidationResult & { user?: UserProfile; organization?: Organization }
> => {
  try {
    const userId = firebaseUser.uid;

    // Step 1: Check if user profile exists
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return {
        isValid: false,
        message: "User profile not found",
        step: "Profile Check",
      };
    }

    const userProfile = userSnap.data() as UserProfile;

    // For admins, allow them in even without full org validation
    if (userProfile.role === "admin") {
      const orgRef = doc(db, "organizations", userProfile.orgID);
      const orgSnap = await getDoc(orgRef);
      const organization = orgSnap.exists()
        ? (orgSnap.data() as Organization)
        : undefined;

      return {
        isValid: true,
        message: "Session validated (admin)",
        user: userProfile,
        organization,
      };
    }

    // Step 2: Check organization reference
    if (!userProfile.orgID) {
      return {
        isValid: false,
        message: "User has no associated organization.",
        step: "Organization Reference",
      };
    }

    // Step 3: Verify organization document
    const orgRef = doc(db, "organizations", userProfile.orgID);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      return {
        isValid: false,
        message: "Organization not found",
        step: "Organization Check",
      };
    }

    const organization = orgSnap.data() as Organization;

    // Step 4: Ensure members array exists
    const members = Array.isArray(organization.members)
      ? organization.members
      : [];

    // Step 5: Check membership
    if (!members.includes(userId)) {
      console.warn(
        `⚠️ User ${userId} not found in members array of org ${organization.name}.`,
      );

      // Auto-heal: Re-add employee if orgID matches
      try {
        await updateDoc(orgRef, {
          members: arrayUnion(userId),
          updatedAt: new Date().toISOString(),
        });
        console.log(`✅ Auto-healed membership for user ${userId}`);
      } catch (err) {
        console.error("❌ Failed to auto-heal membership:", err);
      }

      return {
        isValid: true,
        message: "Session validated (auto-healed membership)",
        user: userProfile,
        organization,
      };
    }

    return {
      isValid: true,
      message: "Session validated",
      user: userProfile,
      organization,
    };
  } catch (error: any) {
    console.error("❌ validateSession error:", error);
    return {
      isValid: false,
      message: error.message || "Session validation failed",
      step: "Unexpected Error",
    };
  }
};

// ---------------- LOGOUT ----------------

export const logoutUser = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log("✅ User logged out");
  } catch (error: any) {
    console.error("❌ Logout error:", error);
    throw new Error("Failed to logout");
  }
};

// ---------------- GETTERS ----------------

export const getCurrentUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const getUserOrganization = async (
  orgID: string,
): Promise<Organization | null> => {
  try {
    const orgDoc = await getDoc(doc(db, "organizations", orgID));
    return orgDoc.exists() ? (orgDoc.data() as Organization) : null;
  } catch (error) {
    console.error("Error fetching organization:", error);
    return null;
  }
};

// UPDATE HELPERS

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>,
): Promise<void> => {
  try {
    const allowedUpdates = {
      name: updates.name,
      department: updates.department,
      photoURL: updates.photoURL,
    };
    await updateDoc(doc(db, "users", userId), {
      ...allowedUpdates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    throw new Error("Failed to update profile");
  }
};

export const updateOrganizationLocation = async (
  orgID: string,
  latitude: number,
  longitude: number,
  allowedRadius: number,
): Promise<void> => {
  try {
    await updateDoc(doc(db, "organizations", orgID), {
      latitude,
      longitude,
      allowedRadius,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error updating organization location:", error);
    throw new Error("Failed to update location");
  }
};

export const removeEmployeeFromOrganization = async (
  adminId: string,
  employeeId: string,
): Promise<void> => {
  try {
    const adminDoc = await getDoc(doc(db, "users", adminId));
    if (!adminDoc.exists() || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized");
    }

    const orgID = adminDoc.data().orgID;
    const orgDoc = await getDoc(doc(db, "organizations", orgID));
    if (!orgDoc.exists()) {
      throw new Error("Organization not found");
    }

    const organization = orgDoc.data() as Organization;
    if (organization.ownerId !== adminId) {
      throw new Error("Only organization owner can remove employees");
    }

    const updatedMembers = organization.members.filter(
      (id) => id !== employeeId,
    );
    await updateDoc(doc(db, "organizations", orgID), {
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error removing employee:", error);
    throw new Error(error.message || "Failed to remove employee");
  }
};
