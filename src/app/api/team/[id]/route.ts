import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const db = await getDb();
    await db.execute('UPDATE team_members SET role = ? WHERE id = ?', [role, id]);

    return NextResponse.json({ success: true, id, role });
  } catch (error: any) {
    console.error('Team PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const db = await getDb();
    await db.execute('DELETE FROM team_members WHERE id = ?', [id]);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Team DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
