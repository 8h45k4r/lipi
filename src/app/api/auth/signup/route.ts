import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { encryptSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

const SignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  email: z.string().email('Enter a valid email').max(255).trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { name, email, password } = parsed.data;

    const db = await getDb();
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const id = `u_${uuidv4()}`;
    const passwordHash = await bcrypt.hash(password, 12);
    await db.execute(
      'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)',
      [id, email, name, passwordHash],
    );

    const token = await encryptSession({ userId: id, email });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());

    return NextResponse.json({ user: { id, name, email } }, { status: 201 });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
