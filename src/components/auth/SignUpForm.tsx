import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Loader2, Info, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface SignupFormProps {
  onBack?: () => void;
  onSwitchToLogin?: () => void;
}

function SignUpForm({ onBack, onSwitchToLogin }: SignupFormProps) {
  const { signupAsAdmin, signupAsEmployee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    department: "",
    role: "employee" as "employee" | "admin",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.organization
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password should be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (formData.role === "admin") {
        await signupAsAdmin(
          formData.name,
          formData.email,
          formData.password,
          formData.organization,
        );
      } else {
        await signupAsEmployee(
          formData.name,
          formData.email,
          formData.password,
          formData.organization,
          formData.department,
        );
      }
    } catch (error: any) {
      console.error(error);
      // Error toast handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl border-0 bg-white/95 backdrop-blur">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mb-4 -ml-2 hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        )}

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            AttendEase
          </h1>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            Create Your Account
          </h2>
          <p className="text-gray-600">
            Get started with smart attendance tracking
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">
              Select Your Role
            </Label>
            <RadioGroup
              value={formData.role}
              onValueChange={(value: string) =>
                setFormData({
                  ...formData,
                  role: value as "employee" | "admin",
                  organization: "",
                })
              }
              disabled={loading}
            >
              <div className="flex items-center space-x-2 border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all">
                <RadioGroupItem
                  value="employee"
                  id="employee"
                  className="text-blue-600"
                />
                <Label htmlFor="employee" className="flex-1 cursor-pointer">
                  <div className="font-semibold text-gray-800">Employee</div>
                  <div className="text-sm text-gray-500">
                    Join an existing organization
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border-2 border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:bg-purple-50/50 cursor-pointer transition-all">
                <RadioGroupItem
                  value="admin"
                  id="admin"
                  className="text-purple-600"
                />
                <Label htmlFor="admin" className="flex-1 cursor-pointer">
                  <div className="font-semibold text-gray-800">Admin</div>
                  <div className="text-sm text-gray-500">
                    Create a new organization
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-sm font-semibold text-gray-700"
            >
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="John Doe"
              disabled={loading}
              required
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-semibold text-gray-700"
            >
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="you@example.com"
              disabled={loading}
              required
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Organization Name */}
          <div className="space-y-2">
            <Label
              htmlFor="organization"
              className="text-sm font-semibold text-gray-700"
            >
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) =>
                setFormData({ ...formData, organization: e.target.value })
              }
              placeholder={
                formData.role === "admin"
                  ? "e.g., Acme Corporation"
                  : "e.g., Acme Corporation"
              }
              disabled={loading}
              required
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="flex items-start gap-2 mt-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
              <p>
                {formData.role === "admin"
                  ? "Choose a unique name for your organization. Employees will use this to join."
                  : "Enter the exact organization name provided by your admin. Names are case-insensitive."}
              </p>
            </div>
          </div>

          {/* Department (Employee only) */}
          {formData.role === "employee" && (
            <div className="space-y-2">
              <Label
                htmlFor="department"
                className="text-sm font-semibold text-gray-700"
              >
                Department{" "}
                <span className="text-gray-400 text-xs">(Optional)</span>
              </Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="e.g., Engineering, Sales, HR"
                disabled={loading}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-semibold text-gray-700"
            >
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="At least 6 characters"
              disabled={loading}
              required
              minLength={6}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-semibold text-gray-700"
            >
              Confirm Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="Re-enter password"
              disabled={loading}
              required
              minLength={6}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        {/* Switch to Login */}
        {onSwitchToLogin && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-700 hover:underline font-semibold"
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export { SignUpForm };
export default SignUpForm;
