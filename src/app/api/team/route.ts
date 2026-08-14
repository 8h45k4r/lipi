import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import {
  ForbiddenError,
  forbiddenResponse,
  getWorkspaceContext,
  requirePermission,
  UnauthorizedError,
  unauthorizedResponse,
} from '@/lib/auth';

const ALLOWED_ROLES = ['Admin', 'Member', 'Viewer'];

export async function GET() {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();
    const [members] = await db.query(
      `SELECT tm.id, tm.name, tm.email, tm.role, tm.status,
              (u.id IS NOT NULL) AS hasAccount
       FROM team_members tm
       LEFT JOIN users u ON u.email = tm.email
       WHERE tm.owner_id = ?`,
      [ctx.dataOwnerId],
    );
    return NextResponse.json(
      (members as any[]).map((m) => ({ ...m, hasAccount: Boolean(m.hasAccount) })),
    );
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Team GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_team');
    const body = await req.json().catch(() => ({}));
    const role = String(body?.role ?? '');
    const email = String(body?.email ?? '').trim().toLowerCase();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Role must be Admin, Member or Viewer.' },
        { status: 400 },
      );
    }
    if (password && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const db = await getDb();

    // Check the roster first so a duplicate 409 can't leave behind a freshly
    // created login.
    const [existingRoster] = await db.execute(
      'SELECT id FROM team_members WHERE owner_id = ? AND email = ?',
      [ctx.dataOwnerId, email],
    );
    if ((existingRoster as any[]).length > 0) {
      return NextResponse.json({ error: 'This email is already in your team.' }, { status: 409 });
    }

    // Does this email already have a login? Roster-link it instead of erroring.
    const [existingUsers] = await db.execute('SELECT id, name FROM users WHERE email = ?', [email]);
    const existingUser = (existingUsers as any[])[0] ?? null;

    let hasAccount = Boolean(existingUser);
    if (password && !existingUser) {
      // Create a real login in the same step (mirrors auth/signup: u_<uuid>, bcrypt-12).
      const userId = `u_${uuidv4()}`;
      const passwordHash = await bcrypt.hash(password, 12);
      await db.execute('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)', [
        userId,
        email,
        name || email.split('@')[0],
        passwordHash,
      ]);
      hasAccount = true;
    }

    // With a login (created here or pre-existing + password flow) the member is
    // Active immediately; otherwise it's the classic invite that activates on
    // first sign-in.
    const status = password ? 'Active' : 'Invited';
    const memberName =
      (password ? name || existingUser?.name : existingUser?.name || name) || 'Pending...';

    const id = Date.now().toString();
    const newMember = { id, name: memberName, email, role, status, hasAccount };
    await db.execute(
      'INSERT INTO team_members (id, name, email, role, status, owner_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, memberName, email, role, status, ctx.dataOwnerId],
    );

    return NextResponse.json(newMember, { status: 201 });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'This email is already in your team.' }, { status: 409 });
    }
    console.error('Team POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
