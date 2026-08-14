/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Lipi — one-command database setup + demo seed.
 *
 *   node scripts/setup.js
 *
 * - Creates the database and ALL tables (idempotent; safe to re-run).
 * - Seeds a demo admin login:  admin@lipi.ai / admin123
 * - Reads connection settings from the same env vars as the app
 *   (see .env.example). Defaults target MAMP: 127.0.0.1:8889 root/root.
 *
 * This replaces the older ad-hoc scripts (init-tables.js, migrate.js,
 * scripts/db_setup.js, scripts/db_migrations*.js, ...).
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const cfg = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 8889), // MAMP default MySQL port
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? 'root', // MAMP default
  multipleStatements: false,
};
const DB_NAME = process.env.DB_NAME || 'lipi_local';

const DEMO_ADMIN = {
  id: 'u_demo_admin',
  email: process.env.DEMO_ADMIN_EMAIL || 'admin@lipi.ai',
  name: 'Demo Admin',
  password: process.env.DEMO_ADMIN_PASSWORD || 'admin123',
};

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
     id            VARCHAR(64)  PRIMARY KEY,
     email         VARCHAR(255) NOT NULL UNIQUE,
     name          VARCHAR(255) NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS documents (
     id           INT AUTO_INCREMENT PRIMARY KEY,
     doc_uid      VARCHAR(64) NOT NULL UNIQUE,
     file_name    VARCHAR(255) NOT NULL,
     mime_type    VARCHAR(100) NOT NULL,
     storage_path VARCHAR(255) NULL,
     page_count   INT DEFAULT 1,
     ocr_text     LONGTEXT,
     parse_config JSON NULL,
     ocr_metadata JSON NULL,
     owner_id     VARCHAR(64) NULL,
     created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_documents_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS extractions (
     id                INT AUTO_INCREMENT PRIMARY KEY,
     doc_uid           VARCHAR(64) NOT NULL,
     schema_json       JSON NOT NULL,
     settings_json     JSON NULL,
     result_json       JSON NOT NULL,
     raw_response      LONGTEXT,
     prompt_tokens     INT DEFAULT 0,
     completion_tokens INT DEFAULT 0,
     total_duration_ns BIGINT DEFAULT 0,
     confidence_score  FLOAT NULL,
     is_reviewed       BOOLEAN DEFAULT FALSE,
     override_count    INT DEFAULT 0,
     created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_doc_uid (doc_uid)
   )`,
  `CREATE TABLE IF NOT EXISTS projects (
     id          INT AUTO_INCREMENT PRIMARY KEY,
     project_uid VARCHAR(64) NOT NULL UNIQUE,
     name        VARCHAR(255) NOT NULL,
     owner_id    VARCHAR(64) NULL,
     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_projects_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS project_documents (
     id          INT AUTO_INCREMENT PRIMARY KEY,
     project_uid VARCHAR(64) NOT NULL,
     doc_uid     VARCHAR(64) NOT NULL,
     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uniq_project_doc (project_uid, doc_uid)
   )`,
  `CREATE TABLE IF NOT EXISTS feedback (
     id            INT AUTO_INCREMENT PRIMARY KEY,
     doc_uid       VARCHAR(64) NOT NULL,
     extraction_id INT NULL,
     value         ENUM('up','down') NOT NULL,
     field_name    VARCHAR(100) NULL,
     old_value     TEXT NULL,
     new_value     TEXT NULL,
     corrected_by  VARCHAR(100) NULL,
     created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS activity (
     id          INT AUTO_INCREMENT PRIMARY KEY,
     type        VARCHAR(50) NOT NULL,
     doc_uid     VARCHAR(64) NULL,
     project_uid VARCHAR(64) NULL,
     details     TEXT,
     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS team_members (
     id         VARCHAR(255) PRIMARY KEY,
     name       VARCHAR(255),
     email      VARCHAR(255) UNIQUE,
     role       VARCHAR(50),
     status     VARCHAR(50),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
  `CREATE TABLE IF NOT EXISTS settings (
     setting_key   VARCHAR(255) PRIMARY KEY,
     setting_value JSON
   )`,
  `CREATE TABLE IF NOT EXISTS pipelines (
     id          VARCHAR(255) PRIMARY KEY,
     name        VARCHAR(255),
     description TEXT,
     status      VARCHAR(50),
     config      JSON,
     owner_id    VARCHAR(64) NULL,
     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_pipelines_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
     id         INT AUTO_INCREMENT PRIMARY KEY,
     role       VARCHAR(50) NOT NULL,
     content    TEXT,
     user_id    VARCHAR(64) NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_chat_user (user_id)
   )`,
  `CREATE TABLE IF NOT EXISTS eval_ground_truth (
     id            INT AUTO_INCREMENT PRIMARY KEY,
     doc_uid       VARCHAR(64) NOT NULL UNIQUE,
     expected_json JSON NOT NULL,
     created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`,
];

// Older databases may pre-date the ownership columns; add them if missing.
const UPGRADES = [
  `ALTER TABLE documents ADD COLUMN owner_id VARCHAR(64) NULL`,
  `ALTER TABLE documents ADD INDEX idx_documents_owner (owner_id)`,
  `ALTER TABLE documents ADD COLUMN storage_path VARCHAR(255) NULL`,
  `ALTER TABLE documents ADD COLUMN page_count INT DEFAULT 1`,
  `ALTER TABLE documents ADD COLUMN parse_config JSON NULL`,
  `ALTER TABLE documents ADD COLUMN ocr_metadata JSON NULL`,
  `ALTER TABLE projects ADD COLUMN owner_id VARCHAR(64) NULL`,
  `ALTER TABLE projects ADD INDEX idx_projects_owner (owner_id)`,
  `ALTER TABLE pipelines ADD COLUMN owner_id VARCHAR(64) NULL`,
  `ALTER TABLE pipelines ADD INDEX idx_pipelines_owner (owner_id)`,
  `ALTER TABLE chat_messages ADD COLUMN user_id VARCHAR(64) NULL`,
  `ALTER TABLE chat_messages ADD INDEX idx_chat_user (user_id)`,
  `ALTER TABLE extractions ADD COLUMN settings_json JSON NULL`,
  `ALTER TABLE extractions ADD COLUMN prompt_tokens INT DEFAULT 0`,
  `ALTER TABLE extractions ADD COLUMN completion_tokens INT DEFAULT 0`,
  `ALTER TABLE extractions ADD COLUMN total_duration_ns BIGINT DEFAULT 0`,
  `ALTER TABLE extractions ADD COLUMN confidence_score FLOAT NULL`,
  `ALTER TABLE extractions ADD COLUMN is_reviewed BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE extractions ADD COLUMN override_count INT DEFAULT 0`,
];

async function main() {
  console.log(`Connecting to MySQL at ${cfg.host}:${cfg.port} as ${cfg.user}...`);
  const server = await mysql.createConnection(cfg);
  await server.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await server.end();

  const db = await mysql.createConnection({ ...cfg, database: DB_NAME });

  console.log(`Creating tables in ${DB_NAME}...`);
  for (const sql of TABLES) await db.query(sql);

  for (const sql of UPGRADES) {
    try {
      await db.query(sql);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') continue;
      throw err;
    }
  }

  // ---- Seed demo admin ----
  const hash = await bcrypt.hash(DEMO_ADMIN.password, 12);
  await db.query(
    `INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
    [DEMO_ADMIN.id, DEMO_ADMIN.email, DEMO_ADMIN.name, hash],
  );

  // ---- Seed defaults (settings + team roster) ----
  await db.query(
    `INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
      ('general', '{"workspaceName":"Lipi Inc","defaultLanguage":"Nepali","defaultOcrEngine":"Lipi Vision v2","timezone":"Asia/Kathmandu"}'),
      ('profile', '{"fullName":"Demo Admin","jobTitle":"Administrator","organization":"Lipi Inc","bio":""}'),
      ('notifications', '{"notifDocCompleted":true,"notifPipelineFailures":true,"notifUsageReports":false,"notifTeamInvites":true,"notifApiAlerts":true,"notifBilling":true,"emailFrequency":"Instant"}'),
      ('security', '{"twoFactor":false}')`,
  );
  await db.query(
    `INSERT IGNORE INTO team_members (id, name, email, role, status) VALUES
      ('m_demo_admin', 'Demo Admin', ?, 'Owner', 'Active')`,
    [DEMO_ADMIN.email],
  );

  // ---- Seed a starter project + pipeline owned by the demo admin ----
  await db.query(
    `INSERT IGNORE INTO projects (project_uid, name, owner_id) VALUES ('proj_demo', 'Demo Project', ?)`,
    [DEMO_ADMIN.id],
  );
  await db.query(
    `INSERT IGNORE INTO pipelines (id, name, description, status, config, owner_id) VALUES
      ('pipe_demo', 'Gazette Extraction', 'Demo pipeline', 'Active',
       '{"triggerType":"Manual","steps":["Upload Trigger","OCR","LLM Extraction"],"runs":"0","successRate":"-"}', ?)`,
    [DEMO_ADMIN.id],
  );

  const [users] = await db.query('SELECT id, email, name FROM users');
  const [tables] = await db.query('SHOW TABLES');
  console.log(`\nTables (${tables.length}):`, tables.map((t) => Object.values(t)[0]).join(', '));
  console.log('Users:', users);
  console.log('\n✔ Setup complete.');
  console.log('──────────────────────────────────────────');
  console.log('  Demo admin login');
  console.log(`    Email:    ${DEMO_ADMIN.email}`);
  console.log(`    Password: ${DEMO_ADMIN.password}`);
  console.log('──────────────────────────────────────────');
  await db.end();
}

main().catch((err) => {
  console.error('\n✖ Setup failed:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error(
      `\nCould not reach MySQL at ${cfg.host}:${cfg.port}.` +
        '\n- MAMP users: make sure MAMP is running (MySQL default port 8889).' +
        '\n- Override with env vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.',
    );
  }
  process.exit(1);
});
