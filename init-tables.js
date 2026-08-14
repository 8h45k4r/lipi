const mysql = require('mysql2/promise');
async function initDb() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  await db.execute(`CREATE TABLE IF NOT EXISTS team_members (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE, role VARCHAR(50), status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (setting_key VARCHAR(255) PRIMARY KEY, setting_value JSON)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS pipelines (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255), description TEXT, status VARCHAR(50), config JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('general', '{"workspaceName":"Lipi Inc","defaultLanguage":"Nepali","defaultOcrEngine":"Lipi Vision v2","timezone":"Asia/Kathmandu"}'), ('profile', '{"fullName":"Bikash Thapa","jobTitle":"Senior Data Engineer","organization":"Lipi Inc","bio":"Passionate about NLP."}'), ('notifications', '{"notifDocCompleted":true,"notifPipelineFailures":true,"notifUsageReports":false,"notifTeamInvites":true,"notifApiAlerts":true,"notifBilling":true,"emailFrequency":"Instant"}'), ('security', '{"twoFactor":false}')`);
  await db.execute(`INSERT IGNORE INTO team_members (id, name, email, role, status) VALUES ('m_1', 'Bikash Thapa', 'bikash@lipi.ai', 'Owner', 'Active'), ('m_2', 'Anil Shrestha', 'anil@lipi.ai', 'Admin', 'Active')`);
  console.log('Tables created and seeded.');
  process.exit(0);
}
initDb().catch(console.error);
