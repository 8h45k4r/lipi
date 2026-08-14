import React from "react";
import { CheckCircle2, AlertCircle, Loader2, Clock, PauseCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status ? status.trim() : "Unknown";
  const lower = normalized.toLowerCase();

  let badgeStyle = "bg-muted text-muted-foreground border-border";
  let icon = <HelpCircle className="w-3.5 h-3.5 shrink-0" />;

  if (["completed", "active", "success", "done", "passed"].includes(lower)) {
    badgeStyle = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
  } else if (["processing", "in progress", "extracting", "running"].includes(lower)) {
    badgeStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    icon = <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />;
  } else if (["queued", "pending"].includes(lower)) {
    badgeStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    icon = <Clock className="w-3.5 h-3.5 shrink-0" />;
  } else if (["paused", "stopped"].includes(lower)) {
    badgeStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    icon = <PauseCircle className="w-3.5 h-3.5 shrink-0" />;
  } else if (["failed", "error", "inactive", "cancelled", "rejected"].includes(lower)) {
    badgeStyle = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20";
    icon = <AlertCircle className="w-3.5 h-3.5 shrink-0" />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-none tracking-wide transition-colors duration-200",
        badgeStyle,
        className
      )}
    >
      {icon}
      <span>{normalized}</span>
    </span>
  );
}
