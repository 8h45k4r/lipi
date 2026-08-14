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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_team');
    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }
    if (!['Admin', 'Member', 'Viewer'].includes(role)) {
      return NextResponse.json({ error: 'Role must be Admin, Member or Viewer.' }, { status: 400 });
    }

    const db = await getDb();
    const [result]: any = await db.execute(
      'UPDATE team_members SET role = ? WHERE id = ? AND owner_id = ?',
      [role, id, ctx.dataOwnerId],
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, role });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Team PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_team');
    const { id } = await params;

    const db = await getDb();
    const [result]: any = await db.execute(
      'DELETE FROM team_members WHERE id = ? AND owner_id = ?',
      [id, ctx.dataOwnerId],
    );
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Team DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
