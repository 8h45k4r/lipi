import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const db = await getDb();
    
    // Fetch projects and left join project_documents and documents to get counts
    const [rows] = await db.query(`
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
      ORDER BY p.created_at DESC
    `);

    const formattedProjects = (rows as any[]).map(p => ({
      id: p.id,
      name: p.name,
      documents: p.documents,
      status: 'Active',
      lastUpdated: p.lastUpdated ? new Date(p.lastUpdated).toLocaleDateString() : new Date(p.date).toLocaleDateString()
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error: any) {
    console.error('Projects GET API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = await getDb();
    const uid = `proj_${uuidv4()}`;

    await db.execute('INSERT INTO projects (project_uid, name) VALUES (?, ?)', [uid, name]);

    return NextResponse.json({ id: uid, name });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
