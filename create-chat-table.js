const mysql = require('mysql2/promise');
async function create() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("chat_messages table created.");
  process.exit(0);
}
create().catch(console.error);
