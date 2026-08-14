"use client";

import { Button } from "@/components/ui/button";
import { Book, LifeBuoy, MessageSquare, Search } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-center pt-16">
      <h1 className="text-3xl font-bold text-foreground">How can we help?</h1>
      
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search documentation, guides, or API references..."
          className="w-full border border-input bg-background pl-10 pr-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 text-left">
        <div className="bg-card border border-border p-6 shadow-sm hover:border-primary/50 transition-colors cursor-pointer">
          <Book className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-semibold text-lg text-foreground mb-2">Documentation</h3>
          <p className="text-sm text-muted-foreground">Comprehensive guides and API references for Lipi.</p>
        </div>
        <div className="bg-card border border-border p-6 shadow-sm hover:border-primary/50 transition-colors cursor-pointer">
          <MessageSquare className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-semibold text-lg text-foreground mb-2">Community Forum</h3>
          <p className="text-sm text-muted-foreground">Connect with other developers building with Lipi.</p>
        </div>
        <div className="bg-card border border-border p-6 shadow-sm hover:border-primary/50 transition-colors cursor-pointer">
          <LifeBuoy className="w-8 h-8 text-primary mb-4" />
          <h3 className="font-semibold text-lg text-foreground mb-2">Contact Support</h3>
          <p className="text-sm text-muted-foreground">Get help from our enterprise support team.</p>
        </div>
      </div>
    </div>
  );
}
