import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    
    const [rows] = await db.query(`
      SELECT id, type, doc_uid, project_uid, details, created_at
      FROM activity
      ORDER BY created_at DESC
      LIMIT 50
    `);

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
  } catch (error: any) {
    console.error('Activity API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
