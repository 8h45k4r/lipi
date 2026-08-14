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

// Extra demo logins for exercising role-based access: they sign in as normal
// users but operate inside the demo admin's workspace via team_members rows.
const DEMO_MEMBER = {
  id: 'u_demo_member',
  email: 'member@lipi.ai',
  name: 'Demo Member',
  password: 'member123',
};
const DEMO_VIEWER = {
  id: 'u_demo_viewer',
  email: 'viewer@lipi.ai',
  name: 'Demo Viewer',
  password: 'viewer123',
};

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
     id            VARCHAR(64)  PRIMARY KEY,
     email         VARCHAR(255) NOT NULL UNIQUE,
     name          VARCHAR(255) NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     role          VARCHAR(20)  NOT NULL DEFAULT 'owner',
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
     owner_id      VARCHAR(64) NULL,
     created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_feedback_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS activity (
     id          INT AUTO_INCREMENT PRIMARY KEY,
     type        VARCHAR(50) NOT NULL,
     doc_uid     VARCHAR(64) NULL,
     project_uid VARCHAR(64) NULL,
     owner_id    VARCHAR(64) NULL,
     details     TEXT,
     created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_activity_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
     id           INT AUTO_INCREMENT PRIMARY KEY,
     key_uid      VARCHAR(64) NOT NULL UNIQUE,
     owner_id     VARCHAR(64) NOT NULL,
     name         VARCHAR(255) NOT NULL,
     key_prefix   VARCHAR(20) NOT NULL,
     key_last4    VARCHAR(4) NOT NULL,
     key_hash     VARCHAR(64) NOT NULL,
     last_used_at TIMESTAMP NULL,
     created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_api_keys_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS team_members (
     id         VARCHAR(255) PRIMARY KEY,
     name       VARCHAR(255),
     email      VARCHAR(255),
     role       VARCHAR(50),
     status     VARCHAR(50),
     owner_id   VARCHAR(64) NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uniq_team_owner_email (owner_id, email),
     INDEX idx_team_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS settings (
     id            INT AUTO_INCREMENT PRIMARY KEY,
     setting_key   VARCHAR(191) NOT NULL,
     setting_value JSON,
     owner_id      VARCHAR(64) NULL,
     UNIQUE KEY uniq_owner_setting (owner_id, setting_key),
     INDEX idx_settings_owner (owner_id)
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
  `CREATE TABLE IF NOT EXISTS tool_runs (
     id                INT AUTO_INCREMENT PRIMARY KEY,
     doc_uid           VARCHAR(64) NOT NULL,
     owner_id          VARCHAR(64) NULL,
     tool              VARCHAR(20) NOT NULL,
     request_json      JSON NULL,
     result_json       JSON NOT NULL,
     confidence        VARCHAR(10) NULL,
     prompt_tokens     INT DEFAULT 0,
     completion_tokens INT DEFAULT 0,
     total_duration_ns BIGINT DEFAULT 0,
     created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX idx_tool_runs_doc (doc_uid),
     INDEX idx_tool_runs_owner (owner_id)
   )`,
  `CREATE TABLE IF NOT EXISTS role_permissions (
     id         INT AUTO_INCREMENT PRIMARY KEY,
     owner_id   VARCHAR(64) NOT NULL,
     role       VARCHAR(20) NOT NULL,
     permission VARCHAR(40) NOT NULL,
     allowed    BOOLEAN NOT NULL,
     UNIQUE KEY uniq_owner_role_perm (owner_id, role, permission),
     INDEX idx_role_perms_owner (owner_id)
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
  `ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'owner'`,
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
  // Tenancy columns for activity/feedback/team/settings (enterprise scoping).
  `ALTER TABLE activity ADD COLUMN owner_id VARCHAR(64) NULL`,
  `ALTER TABLE activity ADD INDEX idx_activity_owner (owner_id)`,
  `ALTER TABLE feedback ADD COLUMN owner_id VARCHAR(64) NULL`,
  `ALTER TABLE feedback ADD INDEX idx_feedback_owner (owner_id)`,
  `ALTER TABLE team_members ADD COLUMN owner_id VARCHAR(64) NULL`,
  `ALTER TABLE team_members ADD INDEX idx_team_owner (owner_id)`,
  // team_members: the roster is per-owner now, so the old GLOBAL email unique
  // must go and be replaced by a per-owner unique. The DROP INDEX also
  // tolerates ER_CANT_DROP_FIELD_OR_KEY (index already gone on new installs).
  { sql: `ALTER TABLE team_members DROP INDEX email`, alsoIgnore: ['ER_CANT_DROP_FIELD_OR_KEY'] },
  `ALTER TABLE team_members ADD UNIQUE KEY uniq_team_owner_email (owner_id, email)`,
  // settings: move from a global setting_key PK to per-user rows.
  `ALTER TABLE settings DROP PRIMARY KEY,
     ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST,
     ADD COLUMN owner_id VARCHAR(64) NULL,
     ADD UNIQUE KEY uniq_owner_setting (owner_id, setting_key),
     ADD INDEX idx_settings_owner (owner_id)`,
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

  for (const upgrade of UPGRADES) {
    const { sql, alsoIgnore = [] } = typeof upgrade === 'string' ? { sql: upgrade } : upgrade;
    try {
      await db.query(sql);
    } catch (err) {
      if (
        err.code === 'ER_DUP_FIELDNAME' ||
        err.code === 'ER_DUP_KEYNAME' ||
        alsoIgnore.includes(err.code)
      ) {
        continue;
      }
      throw err;
    }
  }

  // ---- Backfill tenancy on rows that pre-date the owner_id columns ----
  // Runs before seeding so per-user seed rows can't collide with legacy
  // global rows being claimed. UPDATE IGNORE skips rows whose claimed key
  // already exists; leftover unowned settings duplicates are dropped.
  await db.query(`UPDATE documents SET page_count = 1 WHERE page_count IS NULL`);

  // Claiming unowned rows for a single user is destructive on a multi-user
  // database, so it only runs when the demo admin is the sole user — or when
  // the operator opts in explicitly via CLAIM_UNOWNED_TO=<user_id>.
  const claimTarget = process.env.CLAIM_UNOWNED_TO || DEMO_ADMIN.id;
  const [otherUsers] = await db.query(`SELECT COUNT(*) AS n FROM users WHERE id NOT IN (?, ?, ?)`, [
    DEMO_ADMIN.id,
    DEMO_MEMBER.id,
    DEMO_VIEWER.id,
  ]);
  if (process.env.CLAIM_UNOWNED_TO || Number(otherUsers[0].n) === 0) {
    await db.query(`UPDATE documents SET owner_id = ? WHERE owner_id IS NULL`, [claimTarget]);
    await db.query(`UPDATE projects SET owner_id = ? WHERE owner_id IS NULL`, [claimTarget]);
    await db.query(`UPDATE pipelines SET owner_id = ? WHERE owner_id IS NULL`, [claimTarget]);
    await db.query(`UPDATE IGNORE settings SET owner_id = ? WHERE owner_id IS NULL`, [claimTarget]);
    await db.query(`DELETE FROM settings WHERE owner_id IS NULL`);
    await db.query(`UPDATE IGNORE team_members SET owner_id = ? WHERE owner_id IS NULL`, [claimTarget]);
  } else {
    console.log(
      'Skipping claim of unowned rows: this database has real users besides the demo admin.\n' +
        'Unowned documents/projects/pipelines/settings/team rows (owner_id IS NULL) were left as-is.\n' +
        'To claim them intentionally, re-run with CLAIM_UNOWNED_TO=<user_id>.',
    );
  }

  // Owner-join backfills are non-destructive (they only propagate an owner
  // that is already recorded on the joined row) and always run.
  await db.query(
    `UPDATE activity a JOIN documents d ON a.doc_uid = d.doc_uid
     SET a.owner_id = d.owner_id WHERE a.owner_id IS NULL`,
  );
  await db.query(
    `UPDATE activity a JOIN projects p ON a.project_uid = p.project_uid
     SET a.owner_id = p.owner_id WHERE a.owner_id IS NULL`,
  );
  await db.query(
    `UPDATE feedback f JOIN documents d ON f.doc_uid = d.doc_uid
     SET f.owner_id = d.owner_id WHERE f.owner_id IS NULL`,
  );

  // ---- Seed demo admin ----
  const hash = await bcrypt.hash(DEMO_ADMIN.password, 12);
  await db.query(
    `INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
    [DEMO_ADMIN.id, DEMO_ADMIN.email, DEMO_ADMIN.name, hash],
  );

  // ---- Seed defaults (settings + team roster), owned by the demo admin ----
  await db.query(
    `INSERT IGNORE INTO settings (setting_key, setting_value, owner_id) VALUES
      ('general', '{"workspaceName":"Lipi Inc","defaultLanguage":"Nepali","defaultOcrEngine":"Lipi Vision v2","timezone":"Asia/Kathmandu"}', ?),
      ('profile', '{"fullName":"Demo Admin","jobTitle":"Administrator","organization":"Lipi Inc","bio":""}', ?),
      ('notifications', '{"notifDocCompleted":true,"notifPipelineFailures":true,"notifUsageReports":false,"notifTeamInvites":true,"notifApiAlerts":true,"notifBilling":true,"emailFrequency":"Instant"}', ?),
      ('security', '{"twoFactor":false}', ?)`,
    [DEMO_ADMIN.id, DEMO_ADMIN.id, DEMO_ADMIN.id, DEMO_ADMIN.id],
  );
  await db.query(
    `INSERT IGNORE INTO team_members (id, name, email, role, status, owner_id) VALUES
      ('m_demo_admin', 'Demo Admin', ?, 'Owner', 'Active', ?)`,
    [DEMO_ADMIN.email, DEMO_ADMIN.id],
  );

  // ---- Seed demo member/viewer users + their roster rows in the admin workspace ----
  for (const demo of [DEMO_MEMBER, DEMO_VIEWER]) {
    const demoHash = await bcrypt.hash(demo.password, 12);
    await db.query(
      `INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), name = VALUES(name)`,
      [demo.id, demo.email, demo.name, demoHash],
    );
  }
  await db.query(
    `INSERT IGNORE INTO team_members (id, name, email, role, status, owner_id) VALUES
      ('m_demo_member', 'Demo Member', ?, 'Member', 'Active', ?),
      ('m_demo_viewer', 'Demo Viewer', ?, 'Viewer', 'Active', ?)`,
    [DEMO_MEMBER.email, DEMO_ADMIN.id, DEMO_VIEWER.email, DEMO_ADMIN.id],
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

  // ---- Seed a demo document with OCR text so the workspace tools have data ----
  const demoOcr = [
    'नेपाल सरकार',
    'नेपाल राजपत्र',
    'भाग ३७, संख्या १२, काठमाडौं, २०८२ साल',
    '',
    'भूमि व्यवस्था, सहकारी तथा गरिबी निवारण मन्त्रालयको सूचना',
    'जग्गा धनी प्रमाण पुर्जा सम्बन्धी कार्यविधि संशोधन गरिएको सूचना।',
    'जग्गाधनीको नाम: राम बहादुर थापा',
    'कित्ता नं: ४०५, क्षेत्रफल: ०-४-२-०',
    'दर्ता मिति: २०७५-०२-१५',
    '',
    'गृह मन्त्रालयको सूचना',
    'नागरिकता प्रमाणपत्र वितरण सम्बन्धी अनुसूची-२ संशोधन गरिएको छ।',
    'प्रमाण-पत्र नं: ३४-०१-७२-०४५६१',
  ].join('\n');
  await db.query(
    `INSERT IGNORE INTO documents (doc_uid, file_name, mime_type, storage_path, page_count, ocr_text, owner_id)
     VALUES ('doc_demo_gazette', 'Nepal_Gazette_Vol_37.pdf', 'application/pdf', NULL, 2, ?, ?)`,
    [demoOcr, DEMO_ADMIN.id],
  );
  await db.query(
    `INSERT IGNORE INTO project_documents (project_uid, doc_uid) VALUES ('proj_demo', 'doc_demo_gazette')`,
  );
  await db.query(
    `INSERT INTO activity (type, doc_uid, owner_id, details)
     SELECT 'upload', 'doc_demo_gazette', ?, 'Uploaded Nepal_Gazette_Vol_37.pdf (2 pages)'
     WHERE NOT EXISTS (
       SELECT 1 FROM activity WHERE doc_uid = 'doc_demo_gazette' AND type = 'upload'
     )`,
    [DEMO_ADMIN.id],
  );

  const [users] = await db.query('SELECT id, email, name FROM users');
  const [tables] = await db.query('SHOW TABLES');
  console.log(`\nTables (${tables.length}):`, tables.map((t) => Object.values(t)[0]).join(', '));
  console.log('Users:', users);
  console.log('\n✔ Setup complete.');
  console.log('──────────────────────────────────────────');
  console.log('  Demo logins (all share the admin workspace)');
  console.log(`    Owner/Admin:  ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  console.log(`    Member:       ${DEMO_MEMBER.email} / ${DEMO_MEMBER.password}`);
  console.log(`    Viewer:       ${DEMO_VIEWER.email} / ${DEMO_VIEWER.password}`);
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
