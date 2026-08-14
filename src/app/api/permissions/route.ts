import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  ForbiddenError,
  forbiddenResponse,
  getWorkspaceContext,
  requirePermission,
  UnauthorizedError,
  unauthorizedResponse,
} from '@/lib/auth';
import {
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from '@/lib/rbac';

type Matrix = Record<Role, Record<Permission, boolean>>;

/** Roles whose permissions can be edited (owner is locked to all-on). */
const EDITABLE_ROLES: Role[] = ['admin', 'member', 'viewer'];

function defaultMatrix(): Matrix {
  const matrix = {} as Matrix;
  for (const role of ROLES) {
    matrix[role] = {} as Record<Permission, boolean>;
    for (const p of ALL_PERMISSIONS) {
      matrix[role][p] = role === 'owner' ? true : PERMISSIONS[role].includes(p);
    }
  }
  return matrix;
}

/** Builds the effective matrix: defaults + this workspace's override rows. */
async function loadMatrix(db: Awaited<ReturnType<typeof getDb>>, ownerId: string): Promise<Matrix> {
  const matrix = defaultMatrix();
  try {
    const [rows] = await db.query(
      'SELECT role, permission, allowed FROM role_permissions WHERE owner_id = ?',
      [ownerId],
    );
    for (const row of rows as any[]) {
      const role = row.role as Role;
      const permission = row.permission as Permission;
      // Owner overrides are ignored by invariant; unknown values are skipped.
      if (!EDITABLE_ROLES.includes(role) || !ALL_PERMISSIONS.includes(permission)) continue;
      matrix[role][permission] = Boolean(row.allowed);
    }
  } catch (err: any) {
    if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
  }
  return matrix;
}

export async function GET() {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();
    const matrix = await loadMatrix(db, ctx.dataOwnerId);
    return NextResponse.json({ catalog: PERMISSION_CATALOG, roles: ROLES, matrix });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Permissions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_team');

    const body = await req.json().catch(() => null);
    const matrix = body?.matrix;
    if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
      return NextResponse.json({ error: 'A permissions matrix is required.' }, { status: 400 });
    }

    // Validate roles/permissions against the catalog and collect desired values.
    const desired: { role: Role; permission: Permission; allowed: boolean }[] = [];
    for (const [roleKey, perms] of Object.entries(matrix as Record<string, unknown>)) {
      if (roleKey === 'owner') {
        // Owner is locked to all permissions; reject any attempt to turn one off.
        const values = perms && typeof perms === 'object' ? Object.values(perms) : [];
        if (values.some((v) => v === false)) {
          return NextResponse.json(
            { error: 'Owner permissions cannot be changed.' },
            { status: 400 },
          );
        }
        continue;
      }
      if (!EDITABLE_ROLES.includes(roleKey as Role)) {
        return NextResponse.json({ error: `Unknown role: ${roleKey}` }, { status: 400 });
      }
      if (!perms || typeof perms !== 'object' || Array.isArray(perms)) {
        return NextResponse.json({ error: `Invalid permissions for role ${roleKey}.` }, { status: 400 });
      }
      for (const [permission, allowed] of Object.entries(perms as Record<string, unknown>)) {
        if (!ALL_PERMISSIONS.includes(permission as Permission)) {
          return NextResponse.json({ error: `Unknown permission: ${permission}` }, { status: 400 });
        }
        if (typeof allowed !== 'boolean') {
          return NextResponse.json(
            { error: `Permission values must be true or false (${roleKey}.${permission}).` },
            { status: 400 },
          );
        }
        desired.push({ role: roleKey as Role, permission: permission as Permission, allowed });
      }
    }

    // Guard: the workspace must always keep a managing role besides owner.
    if (desired.some((d) => d.role === 'admin' && d.permission === 'manage_team' && !d.allowed)) {
      return NextResponse.json(
        { error: 'The Admin role must keep "Manage team" so the workspace stays manageable.' },
        { status: 400 },
      );
    }

    const db = await getDb();

    // Keep the table minimal: store rows only where the value differs from the
    // role's default; drop overrides that match the default again.
    const upserts: { role: Role; permission: Permission; allowed: boolean }[] = [];
    const deletes: { role: Role; permission: Permission }[] = [];
    for (const d of desired) {
      const isDefault = PERMISSIONS[d.role].includes(d.permission);
      if (d.allowed === isDefault) deletes.push({ role: d.role, permission: d.permission });
      else upserts.push(d);
    }

    for (const d of deletes) {
      await db.execute(
        'DELETE FROM role_permissions WHERE owner_id = ? AND role = ? AND permission = ?',
        [ctx.dataOwnerId, d.role, d.permission],
      );
    }
    if (upserts.length > 0) {
      const values = upserts.flatMap((u) => [ctx.dataOwnerId, u.role, u.permission, u.allowed]);
      await db.query(
        `INSERT INTO role_permissions (owner_id, role, permission, allowed) VALUES ${upserts
          .map(() => '(?, ?, ?, ?)')
          .join(', ')}
         ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
        values,
      );
    }

    await db.execute('INSERT INTO activity (type, owner_id, details) VALUES (?, ?, ?)', [
      'permissions_updated',
      ctx.dataOwnerId,
      'Role permissions updated',
    ]);

    const updated = await loadMatrix(db, ctx.dataOwnerId);
    return NextResponse.json({ success: true, matrix: updated });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Permissions PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
