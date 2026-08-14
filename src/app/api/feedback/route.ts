import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { docId, extractionId, value } = await req.json();
    if (!docId || !extractionId || !['up', 'down'].includes(value)) {
      return NextResponse.json({ error: 'Valid docId, extractionId, and value (up/down) are required' }, { status: 400 });
    }

    const db = await getDb();
    
    await db.execute(
      'INSERT INTO feedback (doc_uid, extraction_id, value) VALUES (?, ?, ?)',
      [docId, extractionId, value]
    );

    // Log Activity
    await db.execute(
      'INSERT INTO activity (type, doc_uid, details) VALUES (?, ?, ?)',
      ['feedback', docId, `User gave thumbs ${value} on extraction`]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
