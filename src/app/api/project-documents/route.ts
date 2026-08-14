import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { projectId, docIds } = await req.json();

    if (!projectId || !docIds || !Array.isArray(docIds)) {
      return NextResponse.json({ error: 'Missing projectId or docIds array' }, { status: 400 });
    }

    const db = await getDb();

    // Verify project exists
    const [projects] = await db.query('SELECT project_uid FROM projects WHERE project_uid = ?', [projectId]);
    if ((projects as any[]).length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Insert associations, ignoring duplicates
    for (const docId of docIds) {
      await db.execute(
        'INSERT IGNORE INTO project_documents (project_uid, doc_uid) VALUES (?, ?)',
        [projectId, docId]
      );
    }

    // Log activity
    await db.execute(
      'INSERT INTO activity (type, doc_uid, details) VALUES (?, ?, ?)',
      ['import', docIds[0] || null, `Imported ${docIds.length} document(s) into project`]
    );

    return NextResponse.json({ success: true, imported: docIds.length });
  } catch (error: any) {
    console.error('Project-documents API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
