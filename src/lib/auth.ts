import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, decryptSession, type SessionPayload } from './session';

/**
 * Data Access Layer helpers for route handlers (Node runtime).
 *
 * `proxy.ts` performs the optimistic redirect/gate at the edge, but the real
 * authorization check happens here, close to the data. Every protected route
 * should call `requireUser()` and scope its queries by the returned userId.
 */

/** Returns the authenticated session, or null if not signed in. */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

/** Thrown by `requireUser()` when there is no valid session. */
export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

/** Returns the authenticated session or throws UnauthorizedError. */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Wraps a route handler body, converting an UnauthorizedError into a 401 JSON
 * response so handlers can `const user = await requireUser()` at the top.
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
