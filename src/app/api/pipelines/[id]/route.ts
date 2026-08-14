import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    const [rows] = await db.query('SELECT * FROM pipelines WHERE id = ?', [id]);
    
    if ((rows as any[]).length === 0) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    
    const pipeline = (rows as any[])[0];
    
    // Ensure config is parsed
    const config = typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : (pipeline.config || {});
    const steps = config.steps || ['OCR Extraction', 'LLM Processing'];
    
    return NextResponse.json({
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        status: pipeline.status,
        runs: 0,
        successRate: '0%',
        steps
      }
    });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    
    await db.query('DELETE FROM pipelines WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pipeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();
    
    if (body.status) {
      await db.query('UPDATE pipelines SET status = ? WHERE id = ?', [body.status, id]);
    }
    
    if (body.steps) {
      const [rows] = await db.query('SELECT config FROM pipelines WHERE id = ?', [id]);
      const pipeline = (rows as any[])[0];
      const config = typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : (pipeline.config || {});
      
      config.steps = body.steps;
      await db.query('UPDATE pipelines SET config = ? WHERE id = ?', [JSON.stringify(config), id]);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating pipeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
