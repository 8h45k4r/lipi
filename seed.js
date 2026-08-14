const mysql = require('mysql2/promise');
async function seed() {
  const connection = await mysql.createConnection({ host: '127.0.0.1', port: 8889, user: 'root', password: 'root', database: 'lipi_local' });
  await connection.execute('INSERT INTO eval_ground_truth (doc_uid, expected_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE expected_json = ?', [
    'doc_1335cca5-dc58-4286-84f0-d3fe4987fd13',
    JSON.stringify({ document_type: 'Citizenship', citizenship_no: '34-01-72-04561', full_name: 'Bhaskar Bhatt', date_of_birth: '2050-08-22 BS', sex: 'Male' }),
    JSON.stringify({ document_type: 'Citizenship', citizenship_no: '34-01-72-04561', full_name: 'Bhaskar Bhatt', date_of_birth: '2050-08-22 BS', sex: 'Male' })
  ]);
  console.log('Seeded successfully.');
  process.exit(0);
}
seed().catch(console.error);
