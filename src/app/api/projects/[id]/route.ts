import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, UnauthorizedError, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const db = await getDb();
    const { id: projectId } = await params;

    // Scope to the owner; unauthorized/missing both return 404.
    const [projectRows] = await db.query(
      'SELECT project_uid as id, name, created_at as date FROM projects WHERE project_uid = ? AND owner_id = ?',
      [projectId, user.userId],
    );

    if ((projectRows as any[]).length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const project = (projectRows as any[])[0];

    const [docRows] = await db.query(
      `
      SELECT
        d.id,
        d.doc_uid as docUid,
        d.file_name as name,
        d.mime_type as mimeType,
        d.created_at as date,
        d.page_count as pages,
        (SELECT COUNT(*) FROM extractions e WHERE e.doc_uid = d.doc_uid) as extractionCount
      FROM documents d
      JOIN project_documents pd ON d.doc_uid = pd.doc_uid
      WHERE pd.project_uid = ?
      ORDER BY d.created_at DESC
    `,
      [projectId],
    );

    const documents = (docRows as any[]).map((doc) => ({
      id: doc.docUid,
      name: doc.name,
      lang: 'Nepali', // Stubbed
      pages: doc.pages || 1,
      status: doc.extractionCount > 0 ? 'Completed' : 'Queued',
      date: new Date(doc.date).toLocaleDateString(),
    }));

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        date: new Date(project.date).toLocaleDateString(),
      },
      documents,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('Project Detail API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const db = await getDb();
    const { id: projectId } = await params;

    // Verify ownership before deleting anything.
    const [owned] = await db.query(
      'SELECT project_uid FROM projects WHERE project_uid = ? AND owner_id = ?',
      [projectId, user.userId],
    );
    if ((owned as any[]).length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM project_documents WHERE project_uid = ?', [projectId]);
      await conn.execute('DELETE FROM projects WHERE project_uid = ? AND owner_id = ?', [
        projectId,
        user.userId,
      ]);
      await conn.execute(
        'INSERT INTO activity (type, project_uid, details) VALUES (?, ?, ?)',
        ['project_delete', projectId, 'Deleted project'],
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
    console.error('Project DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
