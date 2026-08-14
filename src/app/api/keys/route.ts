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
import { createHash, randomBytes } from 'node:crypto';

function formatDate(value: string | Date | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function toListShape(row: any) {
  return {
    id: row.key_uid,
    name: row.name,
    masked: `${row.key_prefix}_****${row.key_last4}`,
    created: formatDate(row.created_at),
    lastUsed: row.last_used_at ? formatDate(row.last_used_at) : 'Never',
  };
}

export async function GET() {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();

    const [rows] = await db.query(
      `SELECT key_uid, name, key_prefix, key_last4, last_used_at, created_at
       FROM api_keys
       WHERE owner_id = ?
       ORDER BY created_at DESC`,
      [ctx.dataOwnerId],
    );

    return NextResponse.json({ keys: (rows as any[]).map(toListShape) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Keys GET API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const CreateSchema = z.object({ name: z.string().min(1, 'Name is required').max(255).trim() });

export async function POST(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_keys');
    const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success || !parsed.data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const db = await getDb();
    const uid = `key_${uuidv4()}`;

    // Full secret is shown once; only a hash is stored.
    const secret = `lipi_${randomBytes(16).toString('hex')}`;
    const keyHash = createHash('sha256').update(secret).digest('hex');
    const keyPrefix = secret.slice(0, 9);
    const keyLast4 = secret.slice(-4);

    await db.execute(
      `INSERT INTO api_keys (key_uid, owner_id, name, key_prefix, key_last4, key_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uid, ctx.dataOwnerId, parsed.data.name, keyPrefix, keyLast4, keyHash],
    );

    await db.execute('INSERT INTO activity (type, owner_id, details) VALUES (?, ?, ?)', [
      'api_key_created',
      ctx.dataOwnerId,
      `API key "${parsed.data.name}" created`,
    ]);

    return NextResponse.json({
      key: {
        id: uid,
        name: parsed.data.name,
        masked: `${keyPrefix}_****${keyLast4}`,
        created: formatDate(new Date()),
        lastUsed: 'Never',
      },
      secret,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Keys POST API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'manage_keys');

    const url = new URL(req.url);
    let id = url.searchParams.get('id');
    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body.id === 'string') id = body.id;
    }
    if (!id) {
      return NextResponse.json({ error: 'Key id is required' }, { status: 400 });
    }

    const db = await getDb();
    const [rows] = await db.query(
      'SELECT name FROM api_keys WHERE key_uid = ? AND owner_id = ?',
      [id, ctx.dataOwnerId],
    );
    const keyName = (rows as any[])[0]?.name;

    const [result] = await db.execute(
      'DELETE FROM api_keys WHERE key_uid = ? AND owner_id = ?',
      [id, ctx.dataOwnerId],
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    await db.execute('INSERT INTO activity (type, owner_id, details) VALUES (?, ?, ?)', [
      'api_key_deleted',
      ctx.dataOwnerId,
      `API key "${keyName ?? id}" deleted`,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Keys DELETE API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
