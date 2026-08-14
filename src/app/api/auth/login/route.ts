import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { encryptSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email').max(255).trim().toLowerCase(),
  password: z.string().min(1, 'Password is required').max(200),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const { email, password } = parsed.data;

    const db = await getDb();
    const [rows] = await db.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [email],
    );
    const user = (rows as any[])[0];

    // Compare against the stored hash (or a dummy hash when the user does not
    // exist) so the response time does not reveal whether the email is known.
    const hash = user?.password_hash ?? '$2a$12$............................................';
    const ok = await bcrypt.compare(password, hash);
    if (!user || !ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await encryptSession({ userId: user.id, email: user.email });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
  }
}
