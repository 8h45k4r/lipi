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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getWorkspaceContext();
    const { id } = await params;
    const db = await getDb();

    const [rows] = await db.query('SELECT * FROM pipelines WHERE id = ? AND owner_id = ?', [
      id,
      ctx.dataOwnerId,
    ]);
    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const pipeline = (rows as any[])[0];
    const config = typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : pipeline.config || {};
    const steps = config.steps || ['OCR Extraction', 'LLM Processing'];

    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        status: pipeline.status,
        runs: 0,
        successRate: '0%',
        steps,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Error fetching pipeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_pipelines');
    const { id } = await params;
    const db = await getDb();

    const [result]: any = await db.query('DELETE FROM pipelines WHERE id = ? AND owner_id = ?', [
      id,
      ctx.dataOwnerId,
    ]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Error deleting pipeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_pipelines');
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const db = await getDb();

    // Verify ownership before any mutation.
    const [owned] = await db.query('SELECT config FROM pipelines WHERE id = ? AND owner_id = ?', [
      id,
      ctx.dataOwnerId,
    ]);
    if ((owned as any[]).length === 0) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    if (body.status) {
      await db.query('UPDATE pipelines SET status = ? WHERE id = ? AND owner_id = ?', [
        body.status,
        id,
        ctx.dataOwnerId,
      ]);
    }

    if (body.steps) {
      const pipeline = (owned as any[])[0];
      const config =
        typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : pipeline.config || {};
      config.steps = body.steps;
      await db.query('UPDATE pipelines SET config = ? WHERE id = ? AND owner_id = ?', [
        JSON.stringify(config),
        id,
        ctx.dataOwnerId,
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Error updating pipeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
