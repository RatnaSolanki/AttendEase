import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./config";
import { User, SignupData, LoginData } from "@/types/user";

// =======================================
//  SIGN UP (Admin creates org / Employee joins org)
// =======================================
export const signUpWithEmail = async (data: SignupData): Promise<User> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password,
    );

    const firebaseUser = userCredential.user;
    await updateProfile(firebaseUser, { displayName: data.fullName });

    let orgID: string;

    if (data.role === "admin") {
      // Admin → create new organization
      orgID = firebaseUser.uid; // use admin UID as org ID
      const orgRef = doc(db, "organizations", orgID);
      await setDoc(orgRef, {
        name: data.organizationName || "My Organization",
        ownerId: firebaseUser.uid,
        officeLocation: {
          latitude: 0,
          longitude: 0,
          radius: 100,
        },
        createdAt: serverTimestamp(),
      });

      // Map organization name to orgID for future employee sign-ups
      if (data.organizationName) {
        await setDoc(
          doc(db, "organizationNames", data.organizationName.toLowerCase()),
          { orgID },
        );
      }
    } else {
      // Employee → join existing organization
      if (!data.organizationName)
        throw new Error("Organization name is required.");

      const orgNameDoc = await getDoc(
        doc(db, "organizationNames", data.organizationName.toLowerCase()),
      );
      if (!orgNameDoc.exists())
        throw new Error(`Organization "${data.organizationName}" not found.`);

      orgID = orgNameDoc.data().orgID;
    }

    // Store user info in Firestore
    const userData: Omit<User, "uid"> = {
      name: data.fullName,
      email: data.email,
      role: data.role,
      department: data.department || "",
      orgID,
      createdAt: new Date(),
    };

    await setDoc(doc(db, "users", firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
    });

    return { uid: firebaseUser.uid, ...userData };
  } catch (error: any) {
    console.error("Signup error:", error);
    const message = error?.code
      ? getAuthErrorMessage(error.code)
      : error?.message || "An unexpected error occurred.";
    throw new Error(message);
  }
};

// =======================================
//  SIGN IN
// =======================================
export const signInWithEmail = async (data: LoginData): Promise<User> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      data.email,
      data.password,
    );

    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
    if (!userDoc.exists())
      throw new Error("User data not found. Please contact support.");

    const userData = userDoc.data() as Omit<User, "uid">;
    return { uid: userCredential.user.uid, ...userData };
  } catch (error: any) {
    console.error("Login error:", error);
    const message = error?.code
      ? getAuthErrorMessage(error.code)
      : error?.message || "An unexpected error occurred.";
    throw new Error(message);
  }
};

// =======================================
//  LOGOUT
// =======================================
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error("Logout error:", error);
    throw new Error(error?.message || "Failed to sign out. Please try again.");
  }
};

// =======================================
//  RESET PASSWORD
// =======================================
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error("Password reset error:", error);
    const message = error?.code
      ? getAuthErrorMessage(error.code)
      : error?.message || "Failed to reset password.";
    throw new Error(message);
  }
};

// =======================================
//  GET CURRENT USER DATA
// =======================================
export const getCurrentUserData = async (uid: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return null;
    return { uid, ...(userDoc.data() as Omit<User, "uid">) };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

// =======================================
//  MARK ATTENDANCE (with org radius check)
// =======================================
export const markAttendance = async (
  userId: string,
  latitude: number,
  longitude: number,
) => {
  try {
    // Get user and organization data
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) throw new Error("User not found.");

    const userData = userDoc.data() as User;
    const orgDoc = await getDoc(doc(db, "organizations", userData.orgID));
    if (!orgDoc.exists()) throw new Error("Organization not found.");

    const orgData = orgDoc.data();
    const office = orgData.officeLocation;
    if (!office?.latitude || !office?.longitude)
      throw new Error("Office location not set. Contact admin.");

    // Check distance from office
    const distance = calculateDistance(
      latitude,
      longitude,
      office.latitude,
      office.longitude,
    );
    if (distance > office.radius) {
      throw new Error(
        `You are ${Math.round(distance)}m away. Must be within ${office.radius}m to check in.`,
      );
    }

    // Mark attendance
    const now = new Date();
    const isLate =
      now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);

    await addDoc(collection(db, "attendance"), {
      userId,
      orgID: userData.orgID,
      timestamp: serverTimestamp(),
      location: { latitude, longitude },
      status: isLate ? "late" : "present",
      verified: false,
      date: now.toISOString().split("T")[0],
      checkInTime: now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    });

    return { success: true, message: "Attendance marked successfully." };
  } catch (error: any) {
    console.error("Attendance error:", error);
    throw new Error(error.message || "Failed to mark attendance.");
  }
};

// =======================================
//  HELPER FUNCTIONS
// =======================================
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please login instead.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled. Please contact support.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection.";
    default:
      return "An error occurred. Please try again.";
  }
};
