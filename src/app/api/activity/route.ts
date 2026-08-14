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

export async function GET() {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();

    // Directly owner-scoped (owner_id is written on every insert and
    // backfilled by scripts/setup.js for legacy rows).
    const [rows] = await db.query(
      `
      SELECT a.id, a.type, a.doc_uid, a.project_uid, a.details, a.created_at
      FROM activity a
      WHERE a.owner_id = ?
      ORDER BY a.created_at DESC
      LIMIT 50
    `,
      [ctx.dataOwnerId],
    );

    const formattedActivities = (rows as any[]).map(row => {
      // Map icons based on type
      let icon = 'Info';
      let color = 'text-primary bg-primary/10';
      if (row.type === 'upload') {
        icon = 'Upload';
        color = 'text-success bg-success/10';
      } else if (row.type === 'extract') {
        icon = 'Play';
        color = 'text-primary bg-primary/10';
      } else if (row.type === 'feedback') {
        icon = 'CheckCircle2';
        color = 'text-warning bg-warning/10';
      } else if (row.type === 'parse' || row.type === 'split' || row.type === 'classify') {
        icon = 'Play';
        color = 'text-primary bg-primary/10';
      }

      return {
        id: row.id,
        type: row.type,
        docUid: row.doc_uid,
        title: `${row.type.charAt(0).toUpperCase() + row.type.slice(1)} completed`,
        description: row.details,
        time: new Date(row.created_at).toLocaleString(),
        icon,
        color
      };
    });

    return NextResponse.json({ activities: formattedActivities });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Activity API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
