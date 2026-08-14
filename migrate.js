const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  
  const alter = async (table, cmd) => {
    try {
      await db.execute(`ALTER TABLE ${table} ${cmd}`);
      console.log(`Success: ${table} ${cmd}`);
    } catch (e) {
      console.log(`Failed/Skipped: ${table} ${cmd} -> ${e.message}`);
    }
  }

  await alter('extractions', 'ADD COLUMN confidence_score FLOAT DEFAULT NULL');
  await alter('extractions', 'ADD COLUMN is_reviewed BOOLEAN DEFAULT FALSE');
  await alter('extractions', 'ADD COLUMN override_count INT DEFAULT 0');

  await alter('documents', 'ADD COLUMN parse_config JSON DEFAULT NULL');
  await alter('documents', 'ADD COLUMN ocr_metadata JSON DEFAULT NULL');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS eval_ground_truth (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doc_uid VARCHAR(64) NOT NULL,
      expected_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Created eval_ground_truth table.');

  await alter('feedback', 'ADD COLUMN field_name VARCHAR(100)');
  await alter('feedback', 'ADD COLUMN old_value TEXT');
  await alter('feedback', 'ADD COLUMN new_value TEXT');
  await alter('feedback', 'ADD COLUMN corrected_by VARCHAR(100)');

  process.exit(0);
}
run().catch(console.error);
