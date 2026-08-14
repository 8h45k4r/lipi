import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ParseConfig } from '@/types/parse';
import { requireUser, UnauthorizedError, unauthorizedResponse } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const { docId, parseConfig } = body as { docId?: string; parseConfig?: ParseConfig };

    if (!docId) {
      return NextResponse.json({ error: 'Missing docId' }, { status: 400 });
    }

    const db = await getDb();

    // Verify the document exists AND belongs to the caller, and select the
    // columns we actually use (previously ocr_text/page_count were read but
    // never selected, so parse always returned empty text).
    const [docs] = await db.query(
      'SELECT id, mime_type, file_name, ocr_text, page_count FROM documents WHERE doc_uid = ? AND owner_id = ?',
      [docId, user.userId],
    );
    if ((docs as any[]).length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = (docs as any[])[0];
    const config: ParseConfig = parseConfig || {};

    const dbOcrText = doc.ocr_text || '';
    const pageCount = doc.page_count || 1;

    await db.execute(
      'INSERT INTO activity (type, doc_uid, details) VALUES (?, ?, ?)',
      ['parse', docId, `Document parsed with ${config.extractionMode || 'default'} settings (${pageCount} pages)`],
    );

    return NextResponse.json({
      success: true,
      pageCount,
      ocrText: dbOcrText,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('Parse API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
