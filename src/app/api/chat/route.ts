import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { requireUser, UnauthorizedError, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();
    const [rows] = await db.query(
      'SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC',
      [user.userId],
    );
    return NextResponse.json({ messages: rows });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { messages, docId } = await req.json().catch(() => ({}));

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
        user.userId,
      ]);
    }

    let systemContext = 'You are Lipi AI, a helpful assistant for analyzing documents.';

    if (docId) {
      // Only ground on documents the caller owns.
      const [rows]: any = await db.query(
        'SELECT ocr_text FROM documents WHERE doc_uid = ? AND owner_id = ?',
        [docId, user.userId],
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
      user.userId,
    ]);

    return NextResponse.json({ message: data.message });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
