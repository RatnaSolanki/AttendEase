"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function Header() {
  return (
    <header className="w-full border-b bg-white/80 backdrop-blur-sm fixed top-0 z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="text-3xl font-semibold">AttendEase</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="lg" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button
            size="lg"
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
