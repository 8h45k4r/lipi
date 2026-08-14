import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, UnauthorizedError, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();

    // Only activity tied to the caller's own documents or projects.
    const [rows] = await db.query(
      `
      SELECT a.id, a.type, a.doc_uid, a.project_uid, a.details, a.created_at
      FROM activity a
      WHERE a.doc_uid IN (SELECT doc_uid FROM documents WHERE owner_id = ?)
         OR a.project_uid IN (SELECT project_uid FROM projects WHERE owner_id = ?)
      ORDER BY a.created_at DESC
      LIMIT 50
    `,
      [user.userId, user.userId],
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
    console.error('Activity API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
