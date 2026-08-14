import mysql from 'mysql2/promise';
async function test() {
  const db = await mysql.createConnection({
    host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local'
  });
  const [rows] = await db.query("SELECT * FROM documents WHERE doc_uid = 'doc_1335cca5-dc58-4286-84f0-d3fe4987fd13'");
  console.log(rows);
  await db.end();
}
test();
