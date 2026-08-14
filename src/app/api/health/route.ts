import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const diagnostics: Record<string, any> = {
    status: 'checking',
    database: { connected: false, error: null },
    ollama: { connected: false, error: null }
  };

  try {
    // Check Database Connectivity
    try {
      const db = await getDb();
      await db.execute('SELECT 1');
      diagnostics.database.connected = true;
    } catch (dbError: any) {
      diagnostics.database.error = dbError.message;
    }

    // Check Ollama Connectivity
    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags');
      if (res.ok) {
        const json = await res.json();
        const hasGemma = json.models?.some((m: any) => m.name.includes('gemma4:12b'));
        diagnostics.ollama.connected = true;
        diagnostics.ollama.hasTargetModel = hasGemma;
      } else {
        diagnostics.ollama.error = `Ollama responded with status ${res.status}`;
      }
    } catch (ollamaError: any) {
      diagnostics.ollama.error = ollamaError.message;
    }

    // Overall Status
    diagnostics.status = (diagnostics.database.connected && diagnostics.ollama.connected) ? 'healthy' : 'unhealthy';

    return NextResponse.json(diagnostics, { 
      status: diagnostics.status === 'healthy' ? 200 : 503 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
