"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserProfile } from "@/lib/firebase/attendance";
import { toast } from "sonner";
import {
  User,
  Mail,
  Briefcase,
  Building2,
  Shield,
  Save,
  Loader2,
  Camera,
  Edit2,
  Clipboard,
  X,
  Check,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProfileContent() {
  const { user, organization, refreshUser } = useAuth();

  const [name, setName] = useState<string>(user?.name || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const initials = useMemo(() => {
    const s = (name || user?.name || "").trim();
    if (!s) return "U";
    return s
      .split(/\s+/)
      .map((n) => (n ? n[0] : ""))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [name, user?.name]);

  const isDirty = useMemo(() => {
    if (!user) return false;
    const nameChanged = (name ?? "").trim() !== (user.name ?? "").trim();
    const emailChanged =
      (email ?? "").trim().toLowerCase() !==
      (user.email ?? "").trim().toLowerCase();
    const avatarChanged = !!avatarFile;
    return nameChanged || emailChanged || avatarChanged;
  }, [name, email, avatarFile, user]);

  const validate = (): boolean => {
    const e: { name?: string; email?: string } = {};
    if (!name || !name.trim()) {
      e.name = "Name is required";
    } else if (name.trim().length < 2) {
      e.name = "Name must be at least 2 characters";
    }

    if (!email || !email.trim()) {
      e.email = "Email is required";
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email.trim())) {
        e.email = "Please enter a valid email address";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChooseAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    const maxMB = 5;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${maxMB}MB`);
      return;
    }
    setAvatarFile(file);
  };

  const handleSaveChanges = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }
    if (!validate()) {
      toast.error("Please fix validation errors");
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(user.uid, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });

      await refreshUser();
      toast.success("Profile updated successfully");
      setIsEditing(false);
      setAvatarFile(null);
      setErrors({});
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setAvatarFile(null);
    setErrors({});
    setIsEditing(false);
  };

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user?.uid ?? "");
      toast.success("User ID copied to clipboard");
    } catch {
      toast.error("Failed to copy User ID");
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background sticky top-0 z-10">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Profile Settings</h1>
      </header>

      {/* Full screen main - removed max-w-7xl */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-muted/30 via-background to-muted/20">
        <div className="w-full h-full px-4 py-6 space-y-6">
          {/* Page Header */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Profile Settings
            </h2>
            <p className="text-muted-foreground mt-2">
              Manage your account information and preferences
            </p>
          </div>

          {/* Profile Header Card */}
          <div className="bg-gradient-to-br from-card via-card to-card/80 rounded-xl shadow-lg border border-border/50 p-6 relative overflow-hidden">
            {isEditing && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
            )}

            <div className="flex flex-col md:flex-row items-center gap-6 relative">
              {/* Avatar Section */}
              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-32 h-32 rounded-full object-cover shadow-xl ring-4 ring-primary/20 transition-all group-hover:ring-primary/30"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center text-primary-foreground text-4xl font-bold shadow-xl ring-4 ring-primary/20 transition-all group-hover:ring-primary/30">
                    {initials}
                  </div>
                )}

                <div className="absolute -bottom-2 -right-2 flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-hidden
                    onChange={(e) =>
                      handleAvatarChange(e.target.files?.[0] ?? null)
                    }
                  />

                  <button
                    type="button"
                    onClick={handleChooseAvatar}
                    title="Change avatar"
                    className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg border-4 border-background hover:bg-primary/90 transition-all hover:scale-110 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  {avatarFile && (
                    <button
                      type="button"
                      onClick={() => setAvatarFile(null)}
                      title="Remove preview"
                      className="bg-destructive text-destructive-foreground rounded-full p-3 shadow-lg border-4 border-background hover:bg-destructive/90 transition-all hover:scale-110 active:scale-95"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-bold">{user?.name ?? "User"}</h3>
                <p className="text-muted-foreground mt-1.5 text-base">
                  {user?.email}
                </p>

                <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/20 text-primary rounded-full text-sm font-semibold ring-2 ring-primary/20 shadow-sm">
                    <Shield className="w-4 h-4" />
                    {user?.role === "admin" ? "Administrator" : "Employee"}
                  </span>

                  {user?.department && (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold ring-2 ring-purple-200 dark:ring-purple-800 shadow-sm">
                      <Briefcase className="w-4 h-4" />
                      {user.department}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    size="lg"
                    className="gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveChanges}
                      disabled={!isDirty || loading}
                      size="lg"
                      className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="lg"
                      disabled={loading}
                      className="shadow-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information Card */}
          <div className="bg-gradient-to-br from-card via-card to-card/80 rounded-xl shadow-lg border border-border/50 p-6 relative overflow-hidden">
            {isEditing && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
            )}

            <div className="flex items-center justify-between mb-6 relative">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                    isEditing
                      ? "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20"
                      : "bg-primary/10",
                  )}
                >
                  <User
                    className={cn(
                      "w-6 h-6 transition-colors",
                      isEditing ? "text-primary-foreground" : "text-primary",
                    )}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Personal Information</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEditing
                      ? "Update your profile details"
                      : "Your account information"}
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-primary/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold shadow-sm">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Editing Mode
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid md:grid-cols-2 gap-6 relative">
              {/* Name Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className={cn(
                    "text-sm font-semibold flex items-center gap-1.5 transition-colors",
                    isEditing ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Full Name
                  <span className="text-destructive text-base">*</span>
                </Label>

                <div className="relative group">
                  <div
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200",
                      isEditing
                        ? "text-primary scale-110"
                        : "text-muted-foreground",
                    )}
                  >
                    <User className="w-full h-full" />
                  </div>

                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name)
                        setErrors({ ...errors, name: undefined });
                    }}
                    disabled={!isEditing}
                    className={cn(
                      "pl-11 pr-11 h-12 text-base font-semibold transition-all duration-200 border-2",
                      isEditing &&
                        !errors.name &&
                        "border-primary/40 bg-primary/5 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/20 shadow-sm",
                      !isEditing &&
                        "bg-muted/40 border-muted cursor-not-allowed text-foreground",
                      errors.name &&
                        "border-destructive/60 bg-destructive/5 focus:ring-destructive/20",
                    )}
                    placeholder="Enter your full name"
                    aria-invalid={!!errors.name}
                  />

                  {isEditing && !errors.name && name.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in duration-200">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}

                  {isEditing && (
                    <div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-focus-within:ring-primary/20 pointer-events-none transition-all" />
                  )}
                </div>

                {errors.name && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive font-medium animate-in slide-in-from-top-1 duration-200">
                    <div className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </div>
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className={cn(
                    "text-sm font-semibold flex items-center gap-1.5 transition-colors",
                    isEditing ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  Email Address
                  <span className="text-destructive text-base">*</span>
                </Label>

                <div className="relative group">
                  <div
                    className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200",
                      isEditing
                        ? "text-primary scale-110"
                        : "text-muted-foreground",
                    )}
                  >
                    <Mail className="w-full h-full" />
                  </div>

                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email)
                        setErrors({ ...errors, email: undefined });
                    }}
                    disabled={!isEditing}
                    className={cn(
                      "pl-11 pr-11 h-12 text-base font-semibold transition-all duration-200 border-2",
                      isEditing &&
                        !errors.email &&
                        "border-primary/40 bg-primary/5 hover:border-primary/60 focus:border-primary focus:ring-4 focus:ring-primary/20 shadow-sm",
                      !isEditing &&
                        "bg-muted/40 border-muted cursor-not-allowed text-foreground",
                      errors.email &&
                        "border-destructive/60 bg-destructive/5 focus:ring-destructive/20",
                    )}
                    placeholder="Enter your email address"
                    aria-invalid={!!errors.email}
                  />

                  {isEditing &&
                    !errors.email &&
                    email.trim() &&
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in duration-200">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                    )}

                  {isEditing && (
                    <div className="absolute inset-0 rounded-lg ring-2 ring-transparent group-focus-within:ring-primary/20 pointer-events-none transition-all" />
                  )}
                </div>

                {errors.email && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive font-medium animate-in slide-in-from-top-1 duration-200">
                    <div className="w-4 h-4 rounded-full bg-destructive/10 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </div>
                    {errors.email}
                  </div>
                )}
              </div>
            </div>

            {/* ✅ FIXED: Changed <p> to <div> to fix hydration error */}
            {!isEditing && (
              <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm">
                <div className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3 font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>
                    Click "Edit Profile" to update your information. Changes will
                    be reflected across your account.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Account Information Card */}
          <div className="bg-gradient-to-br from-card via-card to-card/80 rounded-xl shadow-lg border border-border/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Account Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Read-only account details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User ID */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  User ID
                </Label>
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 rounded-xl px-4 py-3 flex-1 shadow-sm">
                    <p className="text-sm font-mono break-all font-medium">
                      {user?.uid ?? "N/A"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUserId}
                    title="Copy user id"
                    className="h-11 w-11 shadow-sm hover:shadow-md transition-all"
                  >
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Role */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  Role
                </Label>
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 rounded-xl px-4 py-3 shadow-sm">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
                      user?.role === "admin"
                        ? "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300"
                        : "bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300",
                    )}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {user?.role === "admin" ? "Administrator" : "Employee"}
                  </span>
                </div>
              </div>

              {/* Department */}
              {user?.department && (
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    Department
                  </Label>
                  <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 rounded-xl px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold">{user.department}</p>
                  </div>
                </div>
              )}

              {/* Organization */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Organization
                </Label>
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 rounded-xl px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold">
                    {organization?.name ?? "N/A"}
                  </p>
                </div>
              </div>

              {/* Account Type */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  Account Type
                </Label>
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 rounded-xl px-4 py-3 shadow-sm">
                  <p className="text-sm font-semibold">
                    {user?.role === "admin"
                      ? "Admin Account"
                      : "Employee Account"}
                  </p>
                </div>
              </div>

              {/* Organization ID */}
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  Organization ID
                </Label>
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 rounded-xl px-4 py-3 shadow-sm">
                  <p className="text-sm font-mono font-medium">
                    {organization?.orgID ?? "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50 dark:from-amber-950/30 dark:via-amber-900/20 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-6 shadow-md">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 text-lg">
                  Security Notice
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  Your account information is protected and encrypted. Contact
                  your administrator if you need to change your role or
                  organization details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SidebarInset>
  );
}