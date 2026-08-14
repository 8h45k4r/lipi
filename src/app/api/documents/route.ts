import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, UnauthorizedError, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();

    const [rows] = await db.query(
      `
      SELECT
        d.id,
        d.doc_uid as docUid,
        d.file_name as name,
        d.mime_type as mimeType,
        d.page_count as pages,
        d.created_at as date,
        (SELECT COUNT(*) FROM extractions e WHERE e.doc_uid = d.doc_uid) as extractionCount
      FROM documents d
      WHERE d.owner_id = ?
      ORDER BY d.created_at DESC
    `,
      [user.userId],
    );

    const formattedDocs = (rows as any[]).map((doc) => ({
      id: doc.docUid,
      name: doc.name,
      lang: 'Nepali', // Stubbed per earlier UI
      pages: doc.pages || 1,
      status: doc.extractionCount > 0 ? 'Completed' : 'Queued',
      date: new Date(doc.date).toLocaleDateString(),
    }));

    return NextResponse.json({ documents: formattedDocs });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('Documents API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
