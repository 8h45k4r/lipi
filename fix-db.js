const mysql = require('mysql2/promise');
async function fix() {
  const db = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  
  // Delete all duplicate rows in project_documents keeping the lowest id
  await db.execute(`
    DELETE t1 FROM project_documents t1
    INNER JOIN project_documents t2 
    WHERE t1.id > t2.id 
    AND t1.project_uid = t2.project_uid 
    AND t1.doc_uid = t2.doc_uid
  `);
  
  // Add UNIQUE constraint so IGNORE works properly
  await db.execute(`
    ALTER TABLE project_documents 
    ADD UNIQUE KEY unique_proj_doc (project_uid, doc_uid)
  `);
  console.log("Fixed duplicates and added unique key.");
  process.exit(0);
}
fix().catch(console.error);
