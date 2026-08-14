/**
 * Idempotent migration: authentication + per-user ownership.
 *
 * Run with: node scripts/migrate_auth.js
 * DB connection is read from the same env vars as the app (see .env.example);
 * sensible localhost defaults are used when they are unset.
 */
const mysql = require('mysql2/promise');

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lipi_local',
};

// MySQL has no portable "ADD COLUMN IF NOT EXISTS"; ignore duplicate-column errors.
async function addColumn(conn, sql) {
  try {
    await conn.query(sql);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') return;
    throw err;
  }
}

async function main() {
  const conn = await mysql.createConnection(cfg);
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            VARCHAR(64)  PRIMARY KEY,
        email         VARCHAR(255) NOT NULL UNIQUE,
        name          VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Per-user ownership columns on the top-level entities.
    await addColumn(conn, `ALTER TABLE documents ADD COLUMN owner_id VARCHAR(64) NULL`);
    await addColumn(conn, `ALTER TABLE documents ADD INDEX idx_documents_owner (owner_id)`);
    await addColumn(conn, `ALTER TABLE projects ADD COLUMN owner_id VARCHAR(64) NULL`);
    await addColumn(conn, `ALTER TABLE projects ADD INDEX idx_projects_owner (owner_id)`);
    await addColumn(conn, `ALTER TABLE pipelines ADD COLUMN owner_id VARCHAR(64) NULL`);
    await addColumn(conn, `ALTER TABLE pipelines ADD INDEX idx_pipelines_owner (owner_id)`);
    await addColumn(conn, `ALTER TABLE chat_messages ADD COLUMN user_id VARCHAR(64) NULL`);
    await addColumn(conn, `ALTER TABLE chat_messages ADD INDEX idx_chat_user (user_id)`);

    console.log('Auth + ownership migration complete.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
