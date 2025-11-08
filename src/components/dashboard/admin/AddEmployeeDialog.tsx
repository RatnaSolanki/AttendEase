"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  User,
  Mail,
  Lock,
  Briefcase,
  X,
  Check,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { addEmployee } from "@/lib/firebase/admin";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEmployeeDialog({
  isOpen,
  onClose,
  onSuccess,
}: AddEmployeeDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: "", email: "", password: "", department: "" });
      setErrors({ name: "", email: "", password: "" });
      setTouched({ name: false, email: false, password: false });
    }
  }, [isOpen]);

  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
  };

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Name is required";
        if (value.trim().length < 2)
          return "Name must be at least 2 characters";
        return "";

      case "email":
        if (!value.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.trim())) return "Please enter a valid email";
        return "";

      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        if (value.length > 50)
          return "Password must be less than 50 characters";
        return "";

      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const error = validateField(
      field,
      formData[field as keyof typeof formData],
    );
    setErrors({ ...errors, [field]: error });
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (touched[field as keyof typeof touched]) {
      const error = validateField(field, value);
      setErrors({ ...errors, [field]: error });
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: validateField("name", formData.name),
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };
    setErrors(newErrors);
    setTouched({ name: true, email: true, password: true });
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    const { firstName, lastName } = splitName(formData.name);

    setIsLoading(true);
    try {
      await addEmployee(user.uid, {
        firstName,
        lastName,
        email: formData.email.trim(),
        password: formData.password,
        department: formData.department.trim() || undefined,
      });
      toast.success("Employee added successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Add employee error:", error);
      toast.error(error.message || "Failed to add employee");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isFieldValid = (field: keyof typeof formData) => {
    return (
      touched[field as keyof typeof touched] &&
      !errors[field as keyof typeof errors] &&
      formData[field].trim()
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-sm">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Add New Employee</DialogTitle>
              <DialogDescription className="text-xs">
                Create a new employee account for your organization
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-2" />

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {/* Name Field */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium flex items-center gap-1"
              >
                Full Name
                <span className="text-destructive">*</span>
                {isFieldValid("name") && (
                  <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                )}
              </Label>
              <div className="relative">
                <User
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    isFieldValid("name")
                      ? "text-green-500"
                      : "text-muted-foreground",
                  )}
                />
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  disabled={isLoading}
                  className={cn(
                    "pl-10 h-11",
                    touched.name &&
                      errors.name &&
                      "border-destructive bg-destructive/5",
                    isFieldValid("name") &&
                      "border-green-500 bg-green-50 dark:bg-green-950/20",
                  )}
                />
              </div>
              {touched.name && errors.name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium flex items-center gap-1"
              >
                Email Address
                <span className="text-destructive">*</span>
                {isFieldValid("email") && (
                  <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                )}
              </Label>
              <div className="relative">
                <Mail
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    isFieldValid("email")
                      ? "text-green-500"
                      : "text-muted-foreground",
                  )}
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  disabled={isLoading}
                  className={cn(
                    "pl-10 h-11",
                    touched.email &&
                      errors.email &&
                      "border-destructive bg-destructive/5",
                    isFieldValid("email") &&
                      "border-green-500 bg-green-50 dark:bg-green-950/20",
                  )}
                />
              </div>
              {touched.email && errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium flex items-center gap-1"
              >
                Password
                <span className="text-destructive">*</span>
                {isFieldValid("password") && (
                  <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                )}
              </Label>
              <div className="relative">
                <Lock
                  className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                    isFieldValid("password")
                      ? "text-green-500"
                      : "text-muted-foreground",
                  )}
                />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  disabled={isLoading}
                  className={cn(
                    "pl-10 h-11",
                    touched.password &&
                      errors.password &&
                      "border-destructive bg-destructive/5",
                    isFieldValid("password") &&
                      "border-green-500 bg-green-50 dark:bg-green-950/20",
                  )}
                />
              </div>
              {touched.password && errors.password && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
              {!errors.password && formData.password && (
                <p className="text-xs text-muted-foreground">
                  Password strength:{" "}
                  {formData.password.length < 8
                    ? "Weak"
                    : formData.password.length < 12
                      ? "Medium"
                      : "Strong"}
                </p>
              )}
            </div>

            {/* Department Field */}
            <div className="space-y-2">
              <Label
                htmlFor="department"
                className="text-sm font-medium flex items-center gap-1"
              >
                Department
                <span className="text-xs text-muted-foreground ml-1">
                  (Optional)
                </span>
              </Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="department"
                  placeholder="Engineering, Sales, HR..."
                  value={formData.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  disabled={isLoading}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  The employee will receive login credentials via email and can
                  access the system immediately after creation.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
