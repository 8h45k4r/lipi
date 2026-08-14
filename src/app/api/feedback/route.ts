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

export async function POST(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'submit_feedback');
    const { docId, extractionId, value } = await req.json().catch(() => ({}));
    if (!docId || !extractionId || !['up', 'down'].includes(value)) {
      return NextResponse.json(
        { error: 'Valid docId, extractionId, and value (up/down) are required' },
        { status: 400 },
      );
    }

    const db = await getDb();

    // The document (and thus the extraction) must belong to the caller.
    const [owned] = await db.query(
      'SELECT doc_uid FROM documents WHERE doc_uid = ? AND owner_id = ?',
      [docId, ctx.dataOwnerId],
    );
    if ((owned as any[]).length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        'INSERT INTO feedback (doc_uid, extraction_id, value, owner_id) VALUES (?, ?, ?, ?)',
        [docId, extractionId, value, ctx.dataOwnerId],
      );
      await conn.execute(
        'INSERT INTO activity (type, doc_uid, owner_id, details) VALUES (?, ?, ?, ?)',
        ['feedback', docId, ctx.dataOwnerId, `User gave thumbs ${value} on extraction`],
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Feedback API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
