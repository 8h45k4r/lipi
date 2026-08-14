import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';

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
      const env = getEnv();
      const res = await fetch(`${env.OLLAMA_URL}/api/tags`);
      if (res.ok) {
        const json = await res.json();
        const hasModel = json.models?.some((m: any) => m.name.includes(env.OLLAMA_MODEL));
        diagnostics.ollama.connected = true;
        diagnostics.ollama.hasTargetModel = hasModel;
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
