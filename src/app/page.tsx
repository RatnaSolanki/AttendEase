import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import { Calendar } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <footer className="py-8 px-4 md:px-6 border-t bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">AttendEase</span>
            </div>
            <p className="text-sm text-gray-600">
              © 2025 AttendEase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
