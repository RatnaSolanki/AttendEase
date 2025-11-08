import { Clock, Users, BarChart3, Shield, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeaturesProps {
  onGetStarted?: () => void;
}

export default function Features({ onGetStarted }: FeaturesProps) {
  return (
    <>
      <section className="py-20 px-4 md:px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-3xl md:text-4xl font-bold">
              Why Choose AttendEase?
            </h2>
            <p className="text-2xl text-gray-800 max-w-2xl mx-auto">
              Powerful features designed to make attendance management simple
              and efficient
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600">
                Monitor employee attendance in real-time with instant check-in
                and check-out functionality
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2">Analytics Dashboard</h3>
              <p className="text-gray-600">
                Get detailed insights with comprehensive reports and visual
                analytics
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2">Role-Based Access</h3>
              <p className="text-gray-600">
                Secure system with separate admin and employee portals for
                better control
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 to-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="mb-2">Employee Management</h3>
              <p className="text-gray-600">
                Easily manage employee profiles, departments, and attendance
                records
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-pink-50 to-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-pink-600" />
              </div>
              <h3 className="mb-2">Quick & Easy</h3>
              <p className="text-gray-600">
                Simple interface that requires minimal training for both admins
                and employees
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-indigo-50 to-white hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mb-2">Leave Management</h3>
              <p className="text-gray-600">
                Track leave balances and manage attendance history effortlessly
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-white mb-8 text-3xl md:text-4xl font-bold">
            Ready to Get Started?
          </h2>
          <p className="text-2xl text-blue-100 mb-8">
            Join organizations already using AttendEase to manage their
            attendance
          </p>
          <Button
            size="lg"
            text-lg="true"
            variant="secondary"
            className="px-8"
            onClick={onGetStarted}
          >
            Create Your Account
          </Button>
        </div>
      </section>
    </>
  );
}
