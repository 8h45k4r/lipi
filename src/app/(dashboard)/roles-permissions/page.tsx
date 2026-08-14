"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import type { Permission, PermissionCatalogModule, Role } from "@/lib/rbac";

type Matrix = Record<Role, Record<Permission, boolean>>;

const ROLE_COLUMNS: { role: Role; label: string }[] = [
  { role: "owner", label: "Owner" },
  { role: "admin", label: "Admin" },
  { role: "member", label: "Member" },
  { role: "viewer", label: "Viewer" },
];

/** Squared toggle, matching the ToggleOption pattern on the Workspace page. */
const Toggle = ({
  checked,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
  title?: string;
}) => (
  <div
    role="switch"
    aria-checked={checked}
    aria-disabled={disabled}
    title={title}
    className={`w-9 h-5 border border-border relative shrink-0 transition-colors duration-200 rounded-none inline-block align-middle ${
      checked ? "bg-primary" : "bg-muted"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    onClick={() => {
      if (!disabled) onChange?.();
    }}
  >
    <div
      className={`w-4 h-4 bg-background border border-border absolute top-[1px] transition-all duration-200 rounded-none ${
        checked ? "left-[17px]" : "left-[1px]"
      }`}
    ></div>
  </div>
);

export default function RolesPermissionsPage() {
  const { permissions } = useAuth();
  const canEdit = permissions.includes("manage_team");

  const [catalog, setCatalog] = useState<PermissionCatalogModule[]>([]);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [savedMatrix, setSavedMatrix] = useState<Matrix | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/permissions")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load permissions");
        return res.json();
      })
      .then((data) => {
        setCatalog(data.catalog);
        setMatrix(data.matrix);
        setSavedMatrix(data.matrix);
      })
      .catch(() => toast.error("Could not load roles and permissions"))
      .finally(() => setIsLoading(false));
  }, []);

  const isDirty = useMemo(
    () => JSON.stringify(matrix) !== JSON.stringify(savedMatrix),
    [matrix, savedMatrix],
  );

  const toggle = (role: Role, permission: Permission) => {
    if (!matrix || role === "owner") return;
    setMatrix({
      ...matrix,
      [role]: { ...matrix[role], [permission]: !matrix[role][permission] },
    });
  };

  const handleCancel = () => setMatrix(savedMatrix);

  const handleSave = async () => {
    if (!matrix) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save permissions");
      setMatrix(data.matrix);
      setSavedMatrix(data.matrix);
      toast.success("Permissions saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save permissions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Roles &amp; Permissions
          </h1>
          <p className="text-muted-foreground text-sm">
            Control what each role can do in this workspace. Changes apply to every member with that role.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              className="rounded-none"
              disabled={!isDirty || isSaving}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none"
              disabled={!isDirty || isSaving}
              onClick={handleSave}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {!canEdit && !isLoading && (
        <div className="border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground rounded-none flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          You have read-only access. Only members who can manage the team may edit permissions.
        </div>
      )}

      <div className="bg-card border border-border shadow-sm rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium w-[40%]">Permission</th>
                {ROLE_COLUMNS.map(({ role, label }) => (
                  <th key={role} className="px-4 py-3 font-medium text-center">
                    <span className="inline-flex items-center gap-1">
                      {role === "owner" && <Lock className="w-3 h-3" />}
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading || !matrix ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading permissions...
                  </td>
                </tr>
              ) : (
                catalog.map((group) => (
                  <ModuleRows
                    key={group.module}
                    group={group}
                    matrix={matrix}
                    canEdit={canEdit}
                    onToggle={toggle}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ModuleRows({
  group,
  matrix,
  canEdit,
  onToggle,
}: {
  group: PermissionCatalogModule;
  matrix: Matrix;
  canEdit: boolean;
  onToggle: (role: Role, permission: Permission) => void;
}) {
  return (
    <>
      <tr className="bg-muted/40 border-b border-border">
        <td
          colSpan={1 + ROLE_COLUMNS.length}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground"
        >
          {group.module}
        </td>
      </tr>
      {group.permissions.map((entry) => (
        <tr key={entry.permission} className="border-b border-border hover:bg-muted/20 transition-colors duration-200">
          <td className="px-4 py-3">
            <div className="font-medium text-foreground">{entry.label}</div>
            <div className="text-xs text-muted-foreground">{entry.description}</div>
          </td>
          {ROLE_COLUMNS.map(({ role }) => {
            const isOwner = role === "owner";
            const isAdminManageTeam = role === "admin" && entry.permission === "manage_team";
            const disabled = isOwner || !canEdit || isAdminManageTeam;
            return (
              <td key={role} className="px-4 py-3 text-center">
                <Toggle
                  checked={matrix[role][entry.permission]}
                  disabled={disabled}
                  onChange={() => onToggle(role, entry.permission)}
                  title={
                    isOwner
                      ? "Owners always have every permission."
                      : isAdminManageTeam
                        ? "Admins must keep team management so the workspace stays manageable."
                        : undefined
                  }
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
