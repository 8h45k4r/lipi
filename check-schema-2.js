const mysql = require('mysql2/promise');
async function check() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  const [cols] = await db.execute("SHOW COLUMNS FROM projects");
  console.log("Projects Columns:", cols);
  const [cols2] = await db.execute("SHOW COLUMNS FROM project_documents");
  console.log("Project Docs Columns:", cols2);
  const [docs] = await db.execute("SHOW COLUMNS FROM documents");
  console.log("Docs Columns:", docs);
  process.exit(0);
}
check().catch(console.error);
