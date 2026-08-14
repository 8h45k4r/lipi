const mysql = require('mysql2/promise');

async function runMigrations() {
  try {
    const db = await mysql.createPool({
      host: '127.0.0.1',
      port: 8889,
      user: 'root',
      password: 'root',
      database: 'lipi_local'
    });

    console.log("Adding new columns for V2...");
    try { await db.query('ALTER TABLE documents ADD COLUMN page_count INT NULL'); } catch(e) {}
    try { await db.query('ALTER TABLE extractions ADD COLUMN prompt_tokens INT NOT NULL DEFAULT 0'); } catch(e) {}
    try { await db.query('ALTER TABLE extractions ADD COLUMN completion_tokens INT NOT NULL DEFAULT 0'); } catch(e) {}
    try { await db.query('ALTER TABLE extractions ADD COLUMN total_duration_ns BIGINT NOT NULL DEFAULT 0'); } catch(e) {}

    console.log("V2 Migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigrations();
