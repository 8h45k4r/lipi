/**
 * Role- and permission-based access control.
 *
 * A signed-in user operates in exactly one workspace:
 *  - their own (role 'owner'), or
 *  - another owner's workspace, when a team_members row matches their email
 *    (role normalized from the row: 'admin' | 'member' | 'viewer').
 *
 * This module is pure (no IO) so it can be imported from both server routes
 * and client components.
 */

export type Role = 'owner' | 'admin' | 'member' | 'viewer';

export type Permission =
  | 'manage_team'
  | 'manage_keys'
  | 'manage_settings'
  | 'manage_billing'
  | 'upload_documents'
  | 'delete_documents'
  | 'run_tools'
  | 'manage_projects'
  | 'manage_pipelines'
  | 'use_chat'
  | 'submit_feedback';

export const ALL_PERMISSIONS: Permission[] = [
  'manage_team',
  'manage_keys',
  'manage_settings',
  'manage_billing',
  'upload_documents',
  'delete_documents',
  'run_tools',
  'manage_projects',
  'manage_pipelines',
  'use_chat',
  'submit_feedback',
];

export const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  member: [
    'upload_documents',
    'run_tools',
    'manage_projects',
    'manage_pipelines',
    'use_chat',
    'submit_feedback',
  ],
  // Viewers are read-only.
  viewer: [],
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

/** Roles shown in the permissions matrix, most privileged first. */
export const ROLES: Role[] = ['owner', 'admin', 'member', 'viewer'];

export interface PermissionCatalogEntry {
  permission: Permission;
  label: string;
  description: string;
}

export interface PermissionCatalogModule {
  module: string;
  permissions: PermissionCatalogEntry[];
}

/** Human-readable grouping of every permission, for the Roles & Permissions UI. */
export const PERMISSION_CATALOG: PermissionCatalogModule[] = [
  {
    module: 'Documents & Tools',
    permissions: [
      {
        permission: 'upload_documents',
        label: 'Upload documents',
        description: 'Add new documents to the workspace for OCR and processing.',
      },
      {
        permission: 'delete_documents',
        label: 'Delete documents',
        description: 'Permanently remove documents and their extraction history.',
      },
      {
        permission: 'run_tools',
        label: 'Run tools',
        description: 'Run extraction, parsing, classification and splitting on documents.',
      },
      {
        permission: 'submit_feedback',
        label: 'Submit feedback',
        description: 'Rate and correct extraction results to improve accuracy.',
      },
    ],
  },
  {
    module: 'Projects & Pipelines',
    permissions: [
      {
        permission: 'manage_projects',
        label: 'Manage projects',
        description: 'Create, rename and delete projects, and organize documents in them.',
      },
      {
        permission: 'manage_pipelines',
        label: 'Manage pipelines',
        description: 'Create and configure automated processing pipelines.',
      },
    ],
  },
  {
    module: 'AI Assistant',
    permissions: [
      {
        permission: 'use_chat',
        label: 'Use AI Assistant',
        description: 'Chat with the AI assistant about workspace documents.',
      },
    ],
  },
  {
    module: 'Administration',
    permissions: [
      {
        permission: 'manage_team',
        label: 'Manage team',
        description: 'Invite, remove and change roles of workspace members, and edit these permissions.',
      },
      {
        permission: 'manage_keys',
        label: 'Manage API keys',
        description: 'Create and revoke API keys for programmatic access.',
      },
      {
        permission: 'manage_settings',
        label: 'Manage settings',
        description: 'Change workspace settings, defaults and integrations.',
      },
      {
        permission: 'manage_billing',
        label: 'Manage billing',
        description: 'View invoices and change the subscription plan.',
      },
    ],
  },
];

/**
 * Merges a role's default permissions with per-workspace overrides.
 * An override entry (true/false) wins over the default; permissions without an
 * override keep their default. Pure — safe for client and server.
 */
export function resolvePermissions(
  defaults: Permission[],
  overrides: Partial<Record<Permission, boolean>>,
): Permission[] {
  return ALL_PERMISSIONS.filter((p) => overrides[p] ?? defaults.includes(p));
}

/** Normalize a free-form team role string ('Admin', 'MEMBER', ...) to a Role. */
export function normalizeTeamRole(role: unknown): Role {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (normalized === 'owner') return 'owner';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'member') return 'member';
  // Unknown roles get the least privilege.
  return 'viewer';
}
