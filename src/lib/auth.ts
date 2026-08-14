import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, decryptSession, type SessionPayload } from './session';
import { getDb } from './db';
import {
  ALL_PERMISSIONS,
  normalizeTeamRole,
  PERMISSIONS,
  resolvePermissions,
  type Permission,
  type Role,
} from './rbac';

/**
 * Data Access Layer helpers for route handlers (Node runtime).
 *
 * `proxy.ts` performs the optimistic redirect/gate at the edge, but the real
 * authorization check happens here, close to the data. Every protected route
 * should call `requireUser()` and scope its queries by the returned userId.
 */

/** Returns the authenticated session, or null if not signed in. */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

/** Thrown by `requireUser()` when there is no valid session. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

/** Returns the authenticated session or throws UnauthorizedError. */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Wraps a route handler body, converting an UnauthorizedError into a 401 JSON
 * response so handlers can `const user = await requireUser()` at the top.
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Thrown by `requirePermission()` when the caller's role lacks a permission. */
export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden');
    this.name = 'ForbiddenError';
  }
}

/** Converts a ForbiddenError into a 403 JSON response. */
export function forbiddenResponse() {
  return NextResponse.json(
    { error: 'You do not have permission to perform this action.' },
    { status: 403 },
  );
}

export interface WorkspaceContext {
  /** The signed-in user (personal data like chat history keys off this). */
  userId: string;
  /** The workspace owner all shared data is scoped to. */
  dataOwnerId: string;
  /** The caller's role inside that workspace. */
  role: Role;
  /**
   * Effective permissions: role defaults merged with the workspace's
   * role_permissions overrides. Owners always hold every permission.
   */
  permissions: Permission[];
}

/**
 * Loads per-workspace permission overrides for a role as a permission->allowed
 * map. Databases that pre-date the role_permissions table yield no overrides.
 */
async function loadRoleOverrides(
  db: Awaited<ReturnType<typeof getDb>>,
  ownerId: string,
  role: Role,
): Promise<Partial<Record<Permission, boolean>>> {
  try {
    const [rows] = await db.query(
      'SELECT permission, allowed FROM role_permissions WHERE owner_id = ? AND role = ?',
      [ownerId, role],
    );
    const overrides: Partial<Record<Permission, boolean>> = {};
    for (const row of rows as any[]) overrides[row.permission as Permission] = Boolean(row.allowed);
    return overrides;
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE') return {};
    throw err;
  }
}

/**
 * Resolves the caller's workspace: if their email appears on another owner's
 * team roster ('Active' or 'Invited'), they operate inside that workspace with
 * the roster role; otherwise they own their own workspace.
 *
 * First login of an invited member activates the roster row (status ->
 * 'Active', name filled from the users table).
 */
export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const user = await requireUser();
  const db = await getDb();

  const [rows] = await db.query(
    `SELECT tm.id, tm.owner_id AS ownerId, tm.role, tm.status, u.name AS userName
     FROM team_members tm
     JOIN users u ON u.email = tm.email
     WHERE u.id = ? AND tm.owner_id IS NOT NULL AND tm.owner_id <> ?
       AND tm.status IN ('Active', 'Invited')
     LIMIT 1`,
    [user.userId, user.userId],
  );
  const membership = (rows as any[])[0];

  if (!membership) {
    // Invariant: owners always have every permission; overrides never apply.
    return {
      userId: user.userId,
      dataOwnerId: user.userId,
      role: 'owner',
      permissions: ALL_PERMISSIONS,
    };
  }

  // First login activates the invite and records the member's real name.
  if (membership.status === 'Invited') {
    await db.execute(`UPDATE team_members SET status = 'Active', name = ? WHERE id = ?`, [
      membership.userName,
      membership.id,
    ]);
  }

  const role = normalizeTeamRole(membership.role);
  const permissions =
    role === 'owner'
      ? ALL_PERMISSIONS // Invariant: owner overrides are ignored.
      : resolvePermissions(
          PERMISSIONS[role],
          await loadRoleOverrides(db, membership.ownerId, role),
        );

  return {
    userId: user.userId,
    dataOwnerId: membership.ownerId,
    role,
    permissions,
  };
}

/** Throws ForbiddenError when the caller's effective permissions lack one. */
export function requirePermission(ctx: WorkspaceContext, permission: Permission): void {
  if (!ctx.permissions.includes(permission)) throw new ForbiddenError();
}
