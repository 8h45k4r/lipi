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

    console.log("Adding columns to existing tables...");
    // Add columns if they don't exist (using a simple catch to ignore duplicate column errors)
    try { await db.query('ALTER TABLE documents ADD COLUMN storage_path VARCHAR(255) NULL'); } catch(e) {}
    try { await db.query('ALTER TABLE extractions ADD COLUMN settings_json JSON NULL'); } catch(e) {}

    console.log("Creating new tables...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_uid VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_uid VARCHAR(64) NOT NULL,
        doc_uid VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doc_uid VARCHAR(64) NOT NULL,
        extraction_id INT NOT NULL,
        value ENUM('up', 'down') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        doc_uid VARCHAR(64) NULL,
        project_uid VARCHAR(64) NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Migrations completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigrations();
