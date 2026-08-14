import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  ForbiddenError,
  forbiddenResponse,
  getWorkspaceContext,
  requirePermission,
  UnauthorizedError,
  unauthorizedResponse,
} from '@/lib/auth';

export async function GET() {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();

    // Only the signed-in user's projects, with document counts.
    const [rows] = await db.query(
      `
      SELECT
        p.project_uid as id,
        p.name as name,
        p.created_at as date,
        COUNT(pd.id) as documents,
        MAX(d.created_at) as lastUpdated
      FROM projects p
      LEFT JOIN project_documents pd ON p.project_uid = pd.project_uid
      LEFT JOIN documents d ON pd.doc_uid = d.doc_uid
      WHERE p.owner_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `,
      [ctx.dataOwnerId],
    );

    const formattedProjects = (rows as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      documents: p.documents,
      status: 'Active',
      lastUpdated: p.lastUpdated
        ? new Date(p.lastUpdated).toLocaleDateString()
        : new Date(p.date).toLocaleDateString(),
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Projects GET API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const CreateSchema = z.object({ name: z.string().min(1, 'Name is required').max(255).trim() });

export async function POST(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_projects');
    const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();
    const uid = `proj_${uuidv4()}`;
    await db.execute('INSERT INTO projects (project_uid, name, owner_id) VALUES (?, ?, ?)', [
      uid,
      parsed.data.name,
      ctx.dataOwnerId,
    ]);

    return NextResponse.json({ id: uid, name: parsed.data.name });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Projects POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
