import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const resolvedParams = await params;
    const docId = resolvedParams.id;

    const [rows] = await db.query(`
      SELECT 
        d.id, 
        d.doc_uid as docUid, 
        d.file_name as name, 
        d.mime_type as mimeType,
        d.storage_path as storagePath,
        d.page_count as pages,
        d.created_at as date
      FROM documents d
      WHERE d.doc_uid = ?
    `, [docId]);

    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = (rows as any[])[0];

    // Fetch the most recent extraction for this document
    const [extRows] = await db.query(`
      SELECT result_json, raw_response, prompt_tokens, completion_tokens, total_duration_ns, created_at
      FROM extractions
      WHERE doc_uid = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [docId]);

    let latestExtraction = null;
    if ((extRows as any[]).length > 0) {
      const ext = (extRows as any[])[0];
      latestExtraction = {
        data: typeof ext.result_json === 'string' ? JSON.parse(ext.result_json) : ext.result_json,
        raw: ext.raw_response,
        metrics: {
          promptTokens: ext.prompt_tokens,
          completionTokens: ext.completion_tokens,
          totalDurationSeconds: ext.total_duration_ns / 1_000_000_000
        },
        date: new Date(ext.created_at).toISOString()
      };
    }

    return NextResponse.json({
      document: {
        id: doc.docUid,
        name: doc.name,
        mimeType: doc.mimeType,
        storagePath: doc.storagePath,
        pages: doc.pages || 1,
        date: new Date(doc.date).toLocaleDateString(),
        latestExtraction
      }
    });

  } catch (error: any) {
    console.error('Document Detail API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const resolvedParams = await params;
    const docId = resolvedParams.id;

    await db.execute('DELETE FROM project_documents WHERE doc_uid = ?', [docId]);
    await db.execute('DELETE FROM extractions WHERE doc_uid = ?', [docId]);
    await db.execute('DELETE FROM documents WHERE doc_uid = ?', [docId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
