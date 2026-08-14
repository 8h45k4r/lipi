import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runLocalSplit, SplitSection } from '@/lib/ollama';
import {
  ForbiddenError,
  forbiddenResponse,
  getWorkspaceContext,
  requirePermission,
  UnauthorizedError,
  unauthorizedResponse,
} from '@/lib/auth';
import { DocumentNotFoundError, getDocForOwner } from '@/lib/documents';

export async function POST(req: NextRequest) {
  try {
    const ctx = await getWorkspaceContext();
    requirePermission(ctx, 'run_tools');
    const body = await req.json();
    const { docId, sections, partitionKey } = body;

    if (!docId || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json(
        { error: 'docId and sections array are required' },
        { status: 400 },
      );
    }

    const { ocrText, pageCount } = await getDocForOwner(docId, ctx.dataOwnerId);

    // Call the local Ollama integration service
    const result = await runLocalSplit({
      ocrText,
      pageCount,
      sections: sections as SplitSection[],
      partitionKey,
    });

    const db = await getDb();

    const splits = result.data?.splits ?? [];
    const overallConfidence = splits.length > 0 && splits.every((s: any) => s.confidence === 'high') ? 'high' : 'low';
    await db.execute(
      'INSERT INTO tool_runs (doc_uid, owner_id, tool, request_json, result_json, confidence, prompt_tokens, completion_tokens, total_duration_ns) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        docId,
        ctx.dataOwnerId,
        'split',
        JSON.stringify({ sections, partitionKey: partitionKey ?? null }),
        JSON.stringify(result.data ?? {}),
        overallConfidence,
        result.usage.promptTokens,
        result.usage.completionTokens,
        result.usage.totalDurationNs,
      ],
    );

    // Log Activity
    await db.execute(
      'INSERT INTO activity (type, doc_uid, owner_id, details) VALUES (?, ?, ?, ?)',
      ['split', docId, ctx.dataOwnerId, `Ran section split (${sections.length} sections)`],
    );

    return NextResponse.json({
      splits: result.data?.splits ?? [],
      partitions: result.data?.partitions ?? [],
      metrics: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalDurationSeconds: result.usage.totalDurationNs / 1_000_000_000, // ns to seconds
      },
    });

  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    console.error('Split API error:', error);

    // Check if it's a connection error indicating Ollama isn't running
    if (error.message && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))) {
      return NextResponse.json(
        { error: 'Cannot connect to the local AI model. Please make sure Ollama is running.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during split.' },
      { status: 500 }
    );
  }
}
