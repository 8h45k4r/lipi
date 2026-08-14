import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ParseConfig } from '@/types/parse';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docId, parseConfig } = body as { docId?: string; parseConfig?: ParseConfig };

    if (!docId) {
      return NextResponse.json({ error: 'Missing docId' }, { status: 400 });
    }

    const db = await getDb();

    // Verify document exists
    const [docs] = await db.query('SELECT id, mime_type, file_name FROM documents WHERE doc_uid = ?', [docId]);
    if ((docs as any[]).length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = (docs as any[])[0];
    const config: ParseConfig = parseConfig || {};

    // We no longer mock 3 pages. We use the real ocr_text from the database.
    const dbOcrText = doc.ocr_text || '';
    const pageCount = doc.page_count || 1;

    // Log activity
    await db.execute(
      'INSERT INTO activity (type, doc_uid, details) VALUES (?, ?, ?)',
      ['parse', docId, `Document parsed with ${config.extractionMode || 'default'} settings (${pageCount} pages)`]
    );

    return NextResponse.json({
      success: true,
      pageCount,
      ocrText: dbOcrText
    });
  } catch (error: any) {
    console.error('Parse API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

