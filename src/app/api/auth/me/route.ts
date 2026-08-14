import { NextResponse } from 'next/server';
import { getSessionUser, getWorkspaceContext } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ALL_PERMISSIONS, type Permission, type Role } from '@/lib/rbac';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  try {
    const db = await getDb();
    const [rows] = await db.execute('SELECT id, name, email FROM users WHERE id = ?', [session.userId]);
    const user = (rows as any[])[0] ?? null;
    if (!user) return NextResponse.json({ user: null });

    // Resolve the caller's workspace role. Databases that pre-date the RBAC
    // columns (users.role / team roster) fall back to full owner access.
    let role: Role = 'owner';
    let permissions: Permission[] = ALL_PERMISSIONS;
    try {
      const ctx = await getWorkspaceContext();
      role = ctx.role;
      permissions = ctx.permissions; // effective: defaults + workspace overrides
    } catch (err: any) {
      if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
    }

    return NextResponse.json({ user: { ...user, role, permissions } });
  } catch (error) {
    console.error('auth/me error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
