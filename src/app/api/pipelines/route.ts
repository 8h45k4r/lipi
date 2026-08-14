import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const db = await getDb();
    const [rows] = await db.query('SELECT * FROM pipelines ORDER BY created_at DESC');
    
    const pipelines = (rows as Record<string, unknown>[]).map(row => {
      let config: Record<string, unknown> = {};
      if (typeof row.config === 'string') {
        try { config = JSON.parse(row.config) as Record<string, unknown>; } catch (e) {}
      } else if (row.config && typeof row.config === 'object') {
        config = row.config as Record<string, unknown>;
      }
      
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status || 'Paused',
        runs: config.runs || '0',
        successRate: config.successRate || '-',
        steps: config.steps || ['Upload Trigger'],
        triggerType: config.triggerType || 'Manual',
      };
    });
    
    return NextResponse.json({ pipelines });
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, triggerType } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const db = await getDb();
    const id = `pipe_${uuidv4()}`;
    const status = 'Paused';
    
    const config = {
      triggerType: triggerType || 'Manual',
      steps: ['Upload Trigger'],
      runs: '0',
      successRate: '-'
    };
    
    await db.query(
      'INSERT INTO pipelines (id, name, description, status, config) VALUES (?, ?, ?, ?, ?)',
      [id, name, description || '', status, JSON.stringify(config)]
    );
    
    return NextResponse.json({
      pipeline: {
        id,
        name,
        description: description || '',
        status,
        runs: '0',
        successRate: '-',
        steps: config.steps,
        triggerType: config.triggerType
      }
    });
  } catch (error) {
    console.error('Error creating pipeline:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
