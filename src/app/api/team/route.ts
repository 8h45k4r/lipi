import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const [members] = await db.query('SELECT id, name, email, role, status FROM team_members');
    return NextResponse.json(members);
  } catch (error: any) {
    console.error('Team GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, message } = body;
    
    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const id = Date.now().toString();
    const newMember = {
      id,
      name: "Pending...",
      email,
      role,
      status: "Invited",
    };

    const db = await getDb();
    await db.execute(
      'INSERT INTO team_members (id, name, email, role, status) VALUES (?, ?, ?, ?, ?)',
      [newMember.id, newMember.name, newMember.email, newMember.role, newMember.status]
    );

    return NextResponse.json(newMember, { status: 201 });
  } catch (error: any) {
    console.error('Team POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
