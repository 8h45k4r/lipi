const mysql = require('mysql2/promise');
async function check() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  const [tables] = await db.execute("SHOW TABLES");
  console.log(tables);
  process.exit(0);
}
check().catch(console.error);
