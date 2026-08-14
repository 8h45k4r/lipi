"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { SearchX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center"
        >
          <div className="w-24 h-24 bg-muted flex items-center justify-center border border-border">
            <SearchX className="w-12 h-12 text-primary" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-2"
        >
          <h1 className="text-4xl font-bold text-foreground tracking-tight">404</h1>
          <h2 className="text-xl font-medium text-foreground">Page not found</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex justify-center gap-4 pt-4"
        >
          <Link href="javascript:history.back()">
            <Button variant="outline" className="border-border hover:bg-muted font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Return to Dashboard
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Decorative background lines to fit the "enterprise/flat" theme */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-px h-full bg-border/50"></div>
        <div className="absolute top-0 left-1/2 w-px h-full bg-border/50"></div>
        <div className="absolute top-0 left-3/4 w-px h-full bg-border/50"></div>
        <div className="absolute top-1/3 left-0 w-full h-px bg-border/50"></div>
        <div className="absolute top-2/3 left-0 w-full h-px bg-border/50"></div>
      </div>
    </div>
  );
}
