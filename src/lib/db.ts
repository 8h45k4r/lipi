import mysql from 'mysql2/promise';
import { getEnv } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: mysql.Pool | undefined;
}

/**
 * Returns a single shared connection pool.
 *
 * The pool is cached on the global object in every environment so that a new
 * pool is never created per request (which would exhaust connections). All
 * credentials come from validated env config — nothing is hardcoded here.
 */
export async function getDb(): Promise<mysql.Pool> {
  if (!globalThis.__dbPool) {
    const env = getEnv();
    globalThis.__dbPool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: env.DB_CONNECTION_LIMIT,
      queueLimit: 0,
    });
  }
  return globalThis.__dbPool;
}
