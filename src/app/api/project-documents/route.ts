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
    requirePermission(ctx, 'manage_projects');
    const { projectId, docIds } = await req.json().catch(() => ({}));

    if (!projectId || !docIds || !Array.isArray(docIds)) {
      return NextResponse.json({ error: 'Missing projectId or docIds array' }, { status: 400 });
    }

    const db = await getDb();

    // The project must belong to the caller.
    const [projects] = await db.query(
      'SELECT project_uid FROM projects WHERE project_uid = ? AND owner_id = ?',
      [projectId, ctx.dataOwnerId],
    );
    if ((projects as any[]).length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only link documents the caller also owns.
    const [ownedDocsRows] = await db.query(
      'SELECT doc_uid FROM documents WHERE owner_id = ?',
      [ctx.dataOwnerId],
    );
    const ownedDocs = new Set((ownedDocsRows as any[]).map((r) => r.doc_uid));
    const toLink = docIds.filter((id: unknown) => typeof id === 'string' && ownedDocs.has(id));

    if (toLink.length === 0) {
      return NextResponse.json({ success: true, imported: 0 });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (const docId of toLink) {
        await conn.execute(
          'INSERT IGNORE INTO project_documents (project_uid, doc_uid) VALUES (?, ?)',
          [projectId, docId],
        );
      }
      await conn.execute(
        'INSERT INTO activity (type, doc_uid, project_uid, owner_id, details) VALUES (?, ?, ?, ?, ?)',
        ['import', toLink[0], projectId, ctx.dataOwnerId, `Imported ${toLink.length} document(s) into project`],
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({ success: true, imported: toLink.length });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Project-documents API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
