import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: mysql.Pool | undefined;
}

export async function getDb(): Promise<mysql.Pool> {
  if (process.env.NODE_ENV === 'production') {
    return mysql.createPool({
      host: '127.0.0.1',
      port: 8889,
      user: 'root',
      password: 'root', // As requested by blueprint
      database: 'lipi_local',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } else {
    // In dev mode, cache the pool on the global object to prevent connection leaks during HMR
    if (!globalThis.__dbPool) {
      globalThis.__dbPool = mysql.createPool({
        host: '127.0.0.1',
        port: 8889,
        user: 'root',
        password: 'root',
        database: 'lipi_local',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }
    return globalThis.__dbPool;
  }
}
