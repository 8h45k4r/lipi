import mysql from 'mysql2/promise';

async function migrate() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 8889,
    user: 'root',
    password: 'root',
    database: 'lipi_local'
  });

  try {
    console.log('Running V4 DB Migrations...');

    await db.query(`
      ALTER TABLE documents 
      ADD COLUMN parse_config JSON NULL;
    `).catch(e => {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('Column parse_config already exists');
      else throw e;
    });

    await db.query(`
      CREATE TABLE IF NOT EXISTS eval_ground_truth (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doc_uid VARCHAR(64) NOT NULL UNIQUE,
        expected_json JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_doc_uid (doc_uid)
      );
    `);

    console.log('V4 Migrations complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.end();
  }
}

migrate();
