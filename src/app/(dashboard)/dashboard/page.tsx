"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Play,
  TrendingUp,
  Info,
  CloudUpload,
  Settings,
  Eye,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Clock,
  Workflow,
  Plus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/app-context";
import { toast } from "sonner";

const mockUsageData = [
  { name: "Mon", credits: 4000, accuracy: 99.1 },
  { name: "Tue", credits: 3000, accuracy: 99.3 },
  { name: "Wed", credits: 2000, accuracy: 99.5 },
  { name: "Thu", credits: 2780, accuracy: 99.2 },
  { name: "Fri", credits: 1890, accuracy: 99.8 },
  { name: "Sat", credits: 2390, accuracy: 99.6 },
  { name: "Sun", credits: 3490, accuracy: 99.7 },
];

interface Metrics {
  totalDocuments: number;
  activePipelines: number;
  successRate: number;
  credits?: {
    used: number;
    total: number;
  };
  creditsUsed?: number;
  totalCredits?: number;
}

interface DocumentItem {
  id: string;
  name: string;
  status: string;
  date: string;
}

interface ActivityItem {
  id: string;
  type: string; // 'upload' | 'parse' | 'review' | 'feedback'
  title: string;
  description: string;
  time: string;
}

interface PendingReviewItem {
  id: string;
  name: string;
  reason: string;
  confidence: string;
  project: string;
}

const defaultActivities: ActivityItem[] = [
  {
    id: "act_1",
    type: "upload",
    title: "Document Uploaded",
    description: "Nepal_Gazette_Vol_37.pdf uploaded to Ministry of Law project",
    time: "10 mins ago",
  },
  {
    id: "act_2",
    type: "parse",
    title: "OCR Parsing Completed",
    description: "Gazette Extraction pipeline parsed 42 fields with 99.4% confidence",
    time: "25 mins ago",
  },
  {
    id: "act_3",
    type: "review",
    title: "Manual Review Requested",
    description: "Lalpurja_Kathmandu_Ward_4.pdf flagged for land owner name verification",
    time: "1 hour ago",
  },
  {
    id: "act_4",
    type: "feedback",
    title: "Operator Feedback Received",
    description: "Correction saved for field 'Nagarikta Number' in Citizenship_Front_Ram.jpg",
    time: "2 hours ago",
  },
  {
    id: "act_5",
    type: "upload",
    title: "Batch Ingestion",
    description: "3 new land ownership records imported into Land Records 2024",
    time: "4 hours ago",
  },
  {
    id: "act_6",
    type: "parse",
    title: "Pipeline Pre-processing",
    description: "Multi-page layout analysis finished for Treaty_Sugauli_Scan.pdf (5 pages)",
    time: "6 hours ago",
  },
];

const defaultPendingReviews: PendingReviewItem[] = [
  {
    id: "doc_3",
    name: "Lalpurja_Kathmandu_Ward_4.pdf",
    reason: "Land owner name field ambiguity detected in scanned Devanagari text",
    confidence: "84.2% conf",
    project: "Land Records 2024",
  },
  {
    id: "doc_6",
    name: "Census_Form_Sample.pdf",
    reason: "Low contrast scan in household member list section requiring validation",
    confidence: "79.8% conf",
    project: "Census 2025",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { documents, pipelines, addDocument } = useApp();

  const [metrics, setMetrics] = useState<Metrics>({
    totalDocuments: documents.length || 8,
    activePipelines: pipelines.filter((p) => p.status === "Active").length || 2,
    successRate: 98.4,
    credits: { used: 142500, total: 500000 },
    creditsUsed: 142500,
    totalCredits: 500000,
  });

  const [recentDocuments, setRecentDocuments] = useState<DocumentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>(defaultActivities);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardRes, activityRes] = await Promise.all([
          fetch("/api/dashboard").catch(() => null),
          fetch("/api/activity").catch(() => null),
        ]);

        if (dashboardRes && dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          if (dashboardData.metrics) {
            setMetrics((prev) => ({
              ...prev,
              ...dashboardData.metrics,
            }));
          }
          if (dashboardData.recentDocuments) {
            setRecentDocuments(dashboardData.recentDocuments);
          }
          if (dashboardData.pendingReviews) {
            setPendingReviews(dashboardData.pendingReviews);
          }
        }

        if (activityRes && activityRes.ok) {
          const activityData = await activityRes.json();
          if (activityData.activities && activityData.activities.length > 0) {
            const mapped = activityData.activities.map((a: any) => ({
              id: a.id || `act_${Math.random()}`,
              type: a.type || (a.icon === "Upload" ? "upload" : a.icon === "Play" ? "parse" : "review"),
              title: a.title || "Activity logged",
              description: a.description || a.details || "",
              time: a.time || "Recently",
            }));
            setActivities(mapped);
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      }
    }
    fetchData();
  }, []);

  // Sync fallback recent documents from AppContext if API empty
  useEffect(() => {
    if (recentDocuments.length === 0 && documents.length > 0) {
      const formatted = documents.slice(0, 5).map((doc) => ({
        id: doc.id,
        name: doc.name,
        status: doc.status,
        date: doc.date,
      }));
      setRecentDocuments(formatted);
    }
  }, [documents, recentDocuments.length]);

  const handleQuickUpload = () => {
    const docName = `Quick_Upload_${Math.floor(Math.random() * 1000)}.pdf`;
    addDocument(docName);
    toast.success(`Started processing ${docName}`);
  };

  const getTimelineMeta = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("upload")) {
      return {
        icon: CloudUpload,
        label: "Upload",
        style: "bg-blue-500/10 text-blue-600 border-blue-300 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800",
        badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
      };
    }
    if (t.includes("parse") || t.includes("extract") || t.includes("settings")) {
      return {
        icon: Settings,
        label: "Parse",
        style: "bg-indigo-500/10 text-indigo-600 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800",
        badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900",
      };
    }
    if (t.includes("review") || t.includes("eye")) {
      return {
        icon: Eye,
        label: "Review",
        style: "bg-amber-500/10 text-amber-600 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800",
        badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
      };
    }
    if (t.includes("feedback") || t.includes("message")) {
      return {
        icon: MessageSquare,
        label: "Feedback",
        style: "bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
      };
    }
    return {
      icon: Activity,
      label: "Event",
      style: "bg-primary/10 text-primary border-primary/30",
      badge: "bg-primary/10 text-primary border-primary/20",
    };
  };

  const metricCards = [
    {
      id: "totalDocs",
      title: "Total Documents",
      value: (metrics.totalDocuments ?? documents.length ?? 0).toLocaleString(),
      icon: FileText,
      iconColor: "text-primary bg-primary/10 border-primary/20",
      trend: "+14.2% vs last month",
      trendPositive: true,
      tooltip: "Total volume of Devanagari & English documents ingested across all workspace projects.",
      href: "/documents",
    },
    {
      id: "tokens",
      title: "Tokens Used",
      value: (metrics.credits?.used ?? metrics.creditsUsed ?? 0).toLocaleString(),
      icon: Zap,
      iconColor: "text-blue-600 bg-blue-500/10 border-blue-200 dark:text-blue-400 dark:border-blue-800",
      trend: "+8.5% usage this week",
      trendPositive: true,
      tooltip: "Total LLM tokens and OCR computation credits consumed for document extraction.",
      href: "/billing",
    },
    {
      id: "accuracy",
      title: "Success Rate",
      value: `${metrics.successRate ?? 0}%`,
      icon: CheckCircle2,
      iconColor: "text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
      trend: "+1.8% target met",
      trendPositive: true,
      tooltip: "Percentage of document extractions processed cleanly without manual user correction.",
      href: "/dashboard",
    },
    {
      id: "pipelines",
      title: "Active Pipelines",
      value: (metrics.activePipelines ?? pipelines.filter((p) => p.status === "Active").length ?? 0).toString(),
      icon: Workflow,
      iconColor: "text-indigo-600 bg-indigo-500/10 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800",
      trend: "3 active workflows",
      trendPositive: true,
      tooltip: "Automated OCR & LLM extraction workflows currently active and processing jobs.",
      href: "/pipelines",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Workspace Overview</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Real-time metric breakdown, pending human reviews, and automated extraction activity.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleQuickUpload}
            className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs text-xs font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Metric Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((card) => {
          const CardContent = (
            <div
              title={card.tooltip}
              className="bg-card border border-border p-5 shadow-xs rounded-none relative group hover:border-primary/50 transition-colors duration-200 h-full flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </span>
                  <div className="relative group/tooltip inline-flex items-center">
                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-primary cursor-help transition-colors" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-52 p-2.5 bg-popover border border-border text-popover-foreground text-xs shadow-md z-30 pointer-events-none rounded-none leading-relaxed">
                      {card.tooltip}
                    </div>
                  </div>
                </div>
                <div className={`p-2 border rounded-none ${card.iconColor}`}>
                  <card.icon className="w-4 h-4 shrink-0" />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-3xl font-bold tracking-tight text-foreground font-sans">{card.value}</p>
              </div>

              <div className="mt-auto pt-4 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-none dark:text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  {card.trend}
                </span>
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.id} href={card.href} className="block h-full">
              {CardContent}
            </Link>
          ) : (
            <div key={card.id} className="h-full">
              {CardContent}
            </div>
          );
        })}
      </div>

      {/* Pending Reviews Callout Section */}
      {pendingReviews.length > 0 && (
        <div className="bg-card border-l-4 border-l-amber-500 border border-border p-5 shadow-xs rounded-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-none shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Pending Reviews</h3>
                  <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-2 py-0.5 border border-amber-500/30 rounded-none">
                    {pendingReviews.length} ACTION REQUIRED
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Low OCR confidence scores and field ambiguities requiring operator verification before export.
                </p>
              </div>
            </div>
            <Link
              href="/documents"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 self-start sm:self-center"
            >
              View All Documents <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingReviews.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between p-4 bg-muted/30 border border-border hover:bg-muted/60 transition-colors rounded-none"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-foreground truncate">{item.name}</span>
                      <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-none shrink-0">
                        {item.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.reason}</p>
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{item.project}</span>
                  <Button
                    size="xs"
                    variant="outline"
                    className="rounded-none border-amber-500/40 hover:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium"
                    onClick={() => router.push(`/workspace?docId=${item.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Review Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Chart & Recent Documents on Left, Vertical Activity Timeline & Quick Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Usage Chart */}
          <div className="bg-card border border-border shadow-xs p-6 rounded-none">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground uppercase tracking-wider">Processing Usage & Accuracy</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Daily document credits consumed and mean confidence rate</p>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-none">
                Weekly View
              </span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockUsageData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "var(--foreground)" }}
                  />
                  <Line type="monotone" dataKey="credits" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Documents Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">Recent Documents</h2>
              <Link href="/documents" className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                View all documents <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-card border border-border shadow-xs overflow-hidden rounded-none">
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-bold text-muted-foreground uppercase bg-muted/50 border-b border-border sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Filename</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Date Added</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentDocuments.slice(0, 5).map((doc) => (
                      <tr key={doc.id} className="hover:bg-muted/40 transition-colors duration-200">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <Link href={`/workspace?docId=${doc.id}`} className="hover:underline hover:text-primary transition-colors font-medium truncate max-w-[220px]">
                              {doc.name}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-none ${
                              doc.status === "Completed"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                                : doc.status === "Processing"
                                ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
                                : doc.status === "Queued"
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                          >
                            {doc.status === "Completed" && <CheckCircle2 className="w-3 h-3" />}
                            {doc.status === "Failed" && <AlertCircle className="w-3 h-3" />}
                            {doc.status === "Processing" && (
                              <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent animate-spin rounded-none" />
                            )}
                            {doc.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{doc.date}</td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/workspace?docId=${doc.id}`}
                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Open <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {recentDocuments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No recent documents found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Vertical Timeline Activity Feed */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-card border border-border shadow-xs p-5 rounded-none space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                onClick={handleQuickUpload}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold py-2.5 px-4 flex items-center justify-center gap-2 rounded-none transition-colors"
              >
                <CloudUpload className="w-4 h-4" /> Quick Document Upload
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/pipelines")}
                className="w-full border-border hover:bg-muted text-foreground text-xs font-medium py-2.5 px-4 flex items-center justify-center gap-2 rounded-none transition-colors"
              >
                <Play className="w-4 h-4 text-primary" /> Run Extraction Scan
              </Button>
              <Link
                href="/documents"
                className="w-full border border-border hover:bg-muted text-foreground text-xs font-medium py-2.5 px-4 flex items-center justify-center gap-2 rounded-none transition-colors block text-center"
              >
                Open OCR Workspace →
              </Link>
            </div>
          </div>

          {/* Vertical Timeline Activity Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">Activity Timeline</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-muted border border-border text-muted-foreground rounded-none">
                Live Feed
              </span>
            </div>

            <div className="bg-card border border-border shadow-xs p-5 rounded-none max-h-[520px] overflow-y-auto relative">
              <div className="relative space-y-6 before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-border before:z-0">
                {activities.map((item, idx) => {
                  const meta = getTimelineMeta(item.type);
                  const IconComponent = meta.icon;
                  return (
                    <div key={item.id || idx} className="relative flex gap-4 z-10 group">
                      {/* Timeline Node Icon */}
                      <div className={`w-8.5 h-8.5 shrink-0 border flex items-center justify-center rounded-none shadow-2xs z-10 ${meta.style}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Timeline Card Content */}
                      <div className="flex-1 bg-muted/20 hover:bg-muted/50 border border-border p-3.5 rounded-none transition-colors duration-200">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 border rounded-none ${meta.badge}`}>
                            {meta.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {item.time}
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs text-foreground mt-1.5 group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {activities.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No recent activity logged.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
