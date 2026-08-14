import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    
    const [rows] = await db.query(`
      SELECT 
        d.id, 
        d.doc_uid as docUid, 
        d.file_name as name, 
        d.mime_type as mimeType,
        d.created_at as date,
        (SELECT COUNT(*) FROM extractions e WHERE e.doc_uid = d.doc_uid) as extractionCount
      FROM documents d
      ORDER BY d.created_at DESC
    `);

    const formattedDocs = (rows as any[]).map(doc => ({
      id: doc.docUid,
      name: doc.name,
      lang: 'Nepali', // Stubbed per earlier UI
      pages: 1, // Stubbed per earlier UI
      status: doc.extractionCount > 0 ? 'Completed' : 'Queued',
      date: new Date(doc.date).toLocaleDateString()
    }));

    return NextResponse.json({ documents: formattedDocs });
  } catch (error: any) {
    console.error('Documents API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
