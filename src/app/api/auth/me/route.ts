import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  try {
    const db = await getDb();
    const [rows] = await db.execute('SELECT id, name, email FROM users WHERE id = ?', [session.userId]);
    const user = (rows as any[])[0] ?? null;
    return NextResponse.json({ user });
  } catch (error) {
    console.error('auth/me error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
