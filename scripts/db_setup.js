const mysql = require('mysql2/promise');

async function setup() {
  try {
    console.log("Connecting to MAMP MySQL at 127.0.0.1:8889...");
    // Connect without database first
    const pool = mysql.createPool({
      host: '127.0.0.1',
      port: 8889,
      user: 'root',
      password: 'root',
    });

    console.log("Creating database lipi_local if it doesn't exist...");
    await pool.query('CREATE DATABASE IF NOT EXISTS lipi_local;');
    
    // Reconnect to the specific database
    const dbPool = mysql.createPool({
      host: '127.0.0.1',
      port: 8889,
      user: 'root',
      password: 'root',
      database: 'lipi_local'
    });

    console.log("Creating 'documents' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        doc_uid      VARCHAR(64) NOT NULL UNIQUE,
        file_name    VARCHAR(255) NOT NULL,
        mime_type    VARCHAR(100) NOT NULL,
        ocr_text     LONGTEXT NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Creating 'extractions' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS extractions (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        doc_uid      VARCHAR(64) NOT NULL,
        schema_json  JSON NOT NULL,
        result_json  JSON NOT NULL,
        raw_response LONGTEXT NOT NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_doc_uid (doc_uid)
      );
    `);

    console.log("Database setup complete!");
    process.exit(0);
  } catch (err) {
    console.error("Error setting up DB:", err);
    process.exit(1);
  }
}

setup();
