"use client";

import { Button } from "@/components/ui/button";
import { CreditCard, Download, ExternalLink } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing & Usage</h1>
        <p className="text-muted-foreground text-sm">Manage your subscription, credits, and invoices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border p-6 shadow-sm">
          <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
            <div>
              <h2 className="text-lg font-medium text-foreground">Enterprise Plan</h2>
              <p className="text-sm text-muted-foreground mt-1">Billed $499/mo + usage</p>
            </div>
            <Button variant="outline" className="border-border shadow-sm">
              Manage Plan
            </Button>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Credits Used</span>
              <span className="text-muted-foreground">14,800 / 100,000</span>
            </div>
            <div className="w-full bg-muted h-2 border border-border/50">
              <div className="bg-primary h-full w-[14.8%]"></div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground flex items-center">
            <ExternalLink className="w-3 h-3 mr-1" /> Overages are billed at $0.005 per credit.
          </p>
        </div>

        <div className="bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-medium text-foreground mb-4">Payment Method</h2>
          <div className="flex items-center gap-3 p-3 border border-border bg-muted/30">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Visa ending in 4242</p>
              <p className="text-xs text-muted-foreground">Expires 12/28</p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4 border-border text-sm">
            Update Method
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">Invoice History</h2>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Amount</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: "inv_1", date: "Aug 01, 2026", amount: "$499.00", status: "Paid" },
              { id: "inv_2", date: "Jul 01, 2026", amount: "$512.50", status: "Paid" },
              { id: "inv_3", date: "Jun 01, 2026", amount: "$499.00", status: "Paid" },
            ].map((invoice) => (
              <tr key={invoice.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{invoice.date}</td>
                <td className="px-6 py-4 text-muted-foreground">{invoice.amount}</td>
                <td className="px-6 py-4">
                  <span className="bg-success/10 text-success border border-success/20 px-2 py-0.5 text-xs font-medium inline-block">
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    <Download className="w-3 h-3 mr-1.5" /> PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
