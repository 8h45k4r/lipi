const mysql = require('mysql2/promise');
async function check() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  const [projects] = await db.execute("SELECT * FROM projects");
  console.log("Projects:", projects);
  const [pd] = await db.execute("SELECT * FROM project_documents");
  console.log("Project Docs:", pd);
  const [q] = await db.execute(`
      SELECT 
        p.project_uid as id,
        p.name as name,
        p.created_at as date,
        COUNT(pd.id) as documents,
        MAX(d.created_at) as lastUpdated
      FROM projects p
      LEFT JOIN project_documents pd ON p.project_uid = pd.project_uid
      LEFT JOIN documents d ON pd.doc_uid = d.doc_uid
      GROUP BY p.id
      ORDER BY p.created_at DESC`);
  console.log("Query result:", q);
  process.exit(0);
}
check().catch(console.error);
