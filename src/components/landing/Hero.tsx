import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 md:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <div className="inline-block mb-6 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-600 border border-blue-100">
            Smart Attendance Management
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl">
            Streamline Your Organization's{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Attendance Tracking
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl">
            Effortlessly manage employee attendance with our intelligent system.
            Real-time tracking, insightful analytics, and role-based access
            control.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Button
              size="lg"
              text-lg="true"
              asChild
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              <Link href="/signup">Create Account</Link>
            </Button>
            <Button
              size="lg"
              text-lg="true"
              variant="outline"
              asChild
              className="px-8"
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
