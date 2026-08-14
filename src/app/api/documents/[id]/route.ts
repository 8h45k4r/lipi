import { NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import {
  ForbiddenError,
  forbiddenResponse,
  getWorkspaceContext,
  requirePermission,
  UnauthorizedError,
  unauthorizedResponse,
} from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();
    const { id: docId } = await params;

    const [rows] = await db.query(
      `
      SELECT
        d.id,
        d.doc_uid as docUid,
        d.file_name as name,
        d.mime_type as mimeType,
        d.storage_path as storagePath,
        d.page_count as pages,
        d.created_at as date
      FROM documents d
      WHERE d.doc_uid = ? AND d.owner_id = ?
    `,
      [docId, ctx.dataOwnerId],
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = (rows as any[])[0];

    // A storage_path can outlive its file (uploads dir cleared, legacy rows).
    // Verify the file exists so the client shows its "no preview" placeholder
    // instead of a PDF render error. Single stat; any error counts as missing.
    if (doc.storagePath) {
      try {
        const env = getEnv();
        const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
          ? env.UPLOAD_DIR
          : path.join(/*turbopackIgnore: true*/ process.cwd(), env.UPLOAD_DIR);
        const safeFilename = path.basename(doc.storagePath);
        await stat(path.join(uploadDir, safeFilename));
      } catch {
        doc.storagePath = null;
      }
    }

    const [extRows] = await db.query(
      `
      SELECT result_json, raw_response, prompt_tokens, completion_tokens, total_duration_ns, created_at
      FROM extractions
      WHERE doc_uid = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [docId],
    );

    let latestExtraction = null;
    if ((extRows as any[]).length > 0) {
      const ext = (extRows as any[])[0];
      latestExtraction = {
        data: typeof ext.result_json === 'string' ? JSON.parse(ext.result_json) : ext.result_json,
        raw: ext.raw_response,
        metrics: {
          promptTokens: ext.prompt_tokens,
          completionTokens: ext.completion_tokens,
          totalDurationSeconds: ext.total_duration_ns / 1_000_000_000,
        },
        date: new Date(ext.created_at).toISOString(),
      };
    }

    // Latest persisted run per tool (split/classify), owner-scoped.
    // Degrades gracefully when the tool_runs table doesn't exist yet
    // (deploy without running `npm run setup`).
    let runRows: unknown = [];
    try {
      [runRows] = await db.query(
        `
      SELECT t.tool, t.result_json, t.confidence, t.prompt_tokens, t.completion_tokens, t.total_duration_ns, t.created_at
      FROM tool_runs t
      INNER JOIN (
        SELECT tool, MAX(id) AS max_id
        FROM tool_runs
        WHERE doc_uid = ? AND owner_id = ? AND tool IN ('split', 'classify')
        GROUP BY tool
      ) latest ON latest.max_id = t.id
    `,
        [docId, ctx.dataOwnerId],
      );
    } catch (err: any) {
      if (err?.code !== 'ER_NO_SUCH_TABLE') throw err;
    }

    const latestRuns: Record<string, any> = {};
    for (const run of runRows as any[]) {
      latestRuns[run.tool] = {
        data: typeof run.result_json === 'string' ? JSON.parse(run.result_json) : run.result_json,
        confidence: run.confidence,
        metrics: {
          promptTokens: run.prompt_tokens,
          completionTokens: run.completion_tokens,
          totalDurationSeconds: run.total_duration_ns / 1_000_000_000,
        },
        date: new Date(run.created_at).toISOString(),
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
        latestExtraction,
        latestSplit: latestRuns.split ?? null,
        latestClassify: latestRuns.classify ?? null,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Document Detail API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'delete_documents');
    const db = await getDb();
    const { id: docId } = await params;

    // Verify ownership before deleting.
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
      await conn.execute('DELETE FROM project_documents WHERE doc_uid = ?', [docId]);
      await conn.execute('DELETE FROM extractions WHERE doc_uid = ?', [docId]);
      await conn.execute('DELETE FROM tool_runs WHERE doc_uid = ?', [docId]);
      await conn.execute('DELETE FROM documents WHERE doc_uid = ? AND owner_id = ?', [docId, ctx.dataOwnerId]);
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
    console.error('Document DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
