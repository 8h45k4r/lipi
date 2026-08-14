import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const ctx = await getWorkspaceContext();
    const db = await getDb();
    const [rows] = await db.query(
      'SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC',
      [ctx.userId],
    );
    return NextResponse.json({ messages: rows });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'use_chat');
    const { messages, docId, projectId } = await req.json().catch(() => ({}));

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    // Never trust client-supplied roles: only user/assistant turns are kept,
    // and the system prompt is always constructed server-side (prevents system
    // prompt injection). Content is coerced to string.
    const safeMessages = messages
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m: any) => ({ role: m.role, content: String(m.content ?? '') }));

    const db = await getDb();
    const lastUser = [...safeMessages].reverse().find((m) => m.role === 'user');

    if (lastUser) {
      await db.execute('INSERT INTO chat_messages (role, content, user_id) VALUES (?, ?, ?)', [
        'user',
        lastUser.content,
        ctx.userId,
      ]);
    }

    let systemContext = 'You are Lipi AI, a helpful assistant for analyzing documents.';

    if (projectId) {
      // Ground on every document in the project folder — owner-scoped on both
      // the project and its documents. Bounded so the prompt stays manageable.
      const MAX_DOCS = 10;
      const MAX_CHARS_PER_DOC = 8000;
      const [rows]: any = await db.query(
        `SELECT d.file_name AS name, d.ocr_text
         FROM project_documents pd
         JOIN projects p ON pd.project_uid = p.project_uid
         JOIN documents d ON pd.doc_uid = d.doc_uid
         WHERE pd.project_uid = ? AND p.owner_id = ? AND d.owner_id = ?
         ORDER BY pd.id ASC
         LIMIT ${MAX_DOCS}`,
        [projectId, ctx.dataOwnerId, ctx.dataOwnerId],
      );
      const docBlocks = (rows as any[])
        .filter((r) => r.ocr_text)
        .map((r) => `<Document name="${r.name}">\n${String(r.ocr_text).slice(0, MAX_CHARS_PER_DOC)}\n</Document>`);
      if (docBlocks.length > 0) {
        systemContext += `\n\nThe user has selected a project folder containing ${docBlocks.length} document(s). Ground your answers in their OCR text below and mention which document you are citing:\n\n${docBlocks.join('\n\n')}`;
      }
    } else if (docId) {
      // Only ground on documents the caller owns.
      const [rows]: any = await db.query(
        'SELECT ocr_text FROM documents WHERE doc_uid = ? AND owner_id = ?',
        [docId, ctx.dataOwnerId],
      );
      if (rows.length > 0 && rows[0].ocr_text) {
        systemContext += `\n\n<Document OCR TEXT>\n${rows[0].ocr_text}\n</Document OCR TEXT>`;
      }
    }

    const env = getEnv();
    const payload = {
      model: env.OLLAMA_MODEL,
      messages: [{ role: 'system', content: systemContext }, ...safeMessages],
      stream: false,
    };

    const response = await fetch(`${env.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama Error:', errorText);
      return NextResponse.json({ error: 'Failed to communicate with AI model' }, { status: 502 });
    }

    const data = await response.json();

    await db.execute('INSERT INTO chat_messages (role, content, user_id) VALUES (?, ?, ?)', [
      'assistant',
      data.message.content,
      ctx.userId,
    ]);

    return NextResponse.json({ message: data.message });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
