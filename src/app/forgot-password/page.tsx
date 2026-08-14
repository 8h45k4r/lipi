"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] bg-card border border-border p-8 shadow-sm">
        
        {!isSent ? (
          <>
            <div className="w-12 h-12 bg-primary/10 flex items-center justify-center mb-6 mx-auto">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-center text-foreground">Forgot Password</h2>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form 
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                setIsSent(true);
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="you@company.com"
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm h-10">
                Send Reset Link
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center transition-colors">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Login
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 bg-success/10 flex items-center justify-center mb-6 mx-auto">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            
            <h2 className="text-2xl font-bold mb-2 text-foreground">Check your email</h2>
            <p className="text-sm text-muted-foreground mb-8">
              We have sent a password reset link to your email address.
            </p>

            <Button 
              onClick={() => setIsSent(false)} // For demo purposes
              variant="outline"
              className="w-full h-10 bg-background border-border hover:bg-muted font-medium"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Return to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
