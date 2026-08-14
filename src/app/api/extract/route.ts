import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  runLocalGemmaExtraction,
  ExtractionField,
} from '@/lib/ollama';

async function getOcrForDoc(docUid: string): Promise<string> {
  const db = await getDb();
  const [rows] = await db.execute('SELECT ocr_text FROM documents WHERE doc_uid = ?', [docUid]);
  const row = (rows as any[])[0];
  if (!row) throw new Error('Document not found in database');
  return row.ocr_text as string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { docId, fields, systemPrompt, settings, parseConfig } = body;

    if (!docId || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'docId and fields array are required' },
        { status: 400 },
      );
    }

    const ocrText = await getOcrForDoc(docId);
    const extractionFields = fields as ExtractionField[];

    // Call the local Ollama integration service
    const result = await runLocalGemmaExtraction({
      ocrText,
      fields: extractionFields,
      systemPrompt: systemPrompt ?? '',
      settings: settings,
      parseConfig: parseConfig,
    });

    // Parse _confidence from LLM output and calculate global average confidence score
    let confidenceScore: number | null = null;
    const confidenceObj = result.data?._confidence;

    if (confidenceObj && typeof confidenceObj === 'object' && !Array.isArray(confidenceObj)) {
      const scores = Object.values(confidenceObj)
        .map((val) => (typeof val === 'number' ? val : parseFloat(String(val))))
        .filter((val) => !isNaN(val) && isFinite(val));

      if (scores.length > 0) {
        const sum = scores.reduce((acc, curr) => acc + curr, 0);
        confidenceScore = sum / scores.length;
      }
    }

    const db = await getDb();
    await db.execute(
      'INSERT INTO extractions (doc_uid, schema_json, settings_json, result_json, raw_response, prompt_tokens, completion_tokens, total_duration_ns, confidence_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        docId,
        JSON.stringify(extractionFields),
        JSON.stringify(settings || {}),
        JSON.stringify(result.data),
        result.raw,
        result.usage.promptTokens,
        result.usage.completionTokens,
        result.usage.totalDurationNs,
        confidenceScore,
      ],
    );

    // Log Activity
    await db.execute(
      'INSERT INTO activity (type, doc_uid, details) VALUES (?, ?, ?)',
      ['extract', docId, `Ran extraction using gemma4:12b`]
    );

    return NextResponse.json({ 
      data: result.data, 
      raw: result.raw,
      metrics: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalDurationSeconds: result.usage.totalDurationNs / 1_000_000_000, // ns to seconds
      },
      confidence_score: confidenceScore,
    });

  } catch (error: any) {
    console.error('Extraction API error:', error);
    
    // Check if it's a connection error indicating Ollama isn't running
    if (error.message && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))) {
      return NextResponse.json(
        { error: 'Cannot connect to local Ollama. Please make sure "ollama serve" is running on 127.0.0.1:11434.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during extraction.' },
      { status: 500 }
    );
  }
}
