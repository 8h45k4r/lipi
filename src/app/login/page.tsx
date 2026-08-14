"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email || "demo@lipi.ai");
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Left Panel */}
      <div className="w-[45%] bg-sidebar hidden lg:flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #003C8D 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center overflow-hidden">
          <span className="text-[20rem] font-bold text-primary select-none whitespace-nowrap">लिपि</span>
        </div>

        <div className="flex-1 flex flex-col justify-center px-16 relative z-10">
          <div className="mb-12">
            <img src="https://saipals.com/wp-content/uploads/2026/08/lipi-logo.svg" alt="Lipi Logo" className="h-16 mb-6" />
            <h2 className="text-2xl font-medium text-foreground mb-4">Image to Text, Any Script</h2>
            <p className="text-lg text-muted-foreground max-w-md">
              AI-powered OCR for Nepali documents, government records, books, handwritten notes, and forms.
            </p>
          </div>
          
          <div className="w-full aspect-video bg-muted border border-border shadow-sm flex items-center justify-center relative">
            <div className="absolute inset-0 bg-primary/5"></div>
            <p className="text-muted-foreground font-medium z-10">[ AI Scanning Illustration ]</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-background px-8">
        <div className="w-full max-w-[400px]">
          <h2 className="text-3xl font-bold mb-8 text-center">Log In</h2>
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="you@company.com"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Password</label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <input 
                type="password" 
                required
                className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 pb-4">
              <input type="checkbox" id="remember" className="border border-input w-4 h-4 rounded-none accent-primary" />
              <label htmlFor="remember" className="text-sm font-medium cursor-pointer">
                Remember me
              </label>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-10">
              Log In
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-medium">Or</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full h-10 bg-background border-border hover:bg-muted font-medium">
              Continue with Google
            </Button>
            <Button variant="outline" className="w-full h-10 bg-background border-border hover:bg-muted font-medium">
              Continue with Microsoft
            </Button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Create Account
            </Link>
          </p>
        </div>

        <div className="absolute bottom-8 flex gap-6 text-xs text-muted-foreground hidden sm:flex">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <span>Version 1.0.0</span>
        </div>
      </div>
    </div>
  );
}
