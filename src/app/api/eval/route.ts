import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getWorkspaceContext, UnauthorizedError, unauthorizedResponse } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const ctx = await getWorkspaceContext();
    const { docId, extractionId } = await req.json();

    if (!docId || !extractionId) {
      return NextResponse.json({ error: 'Missing docId or extractionId' }, { status: 400 });
    }

    const db = await getDb();

    // The document must belong to the caller's workspace.
    const [owned]: any = await db.query(
      'SELECT doc_uid FROM documents WHERE doc_uid = ? AND owner_id = ?',
      [docId, ctx.dataOwnerId],
    );
    if (owned.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Fetch the extraction
    const [extRows]: any = await db.query(
      'SELECT result_json FROM extractions WHERE id = ? AND doc_uid = ?',
      [extractionId, docId],
    );
    if (extRows.length === 0) {
      return NextResponse.json({ error: 'Extraction not found' }, { status: 404 });
    }
    const extractionResult = typeof extRows[0].result_json === 'string' ? JSON.parse(extRows[0].result_json) : extRows[0].result_json;

    // Fetch the ground truth
    const [gtRows]: any = await db.query('SELECT expected_json FROM eval_ground_truth WHERE doc_uid = ? ORDER BY created_at DESC LIMIT 1', [docId]);
    if (gtRows.length === 0) {
      return NextResponse.json({ error: 'Ground truth not found for this document' }, { status: 404 });
    }
    const expectedResult = typeof gtRows[0].expected_json === 'string' ? JSON.parse(gtRows[0].expected_json) : gtRows[0].expected_json;

    // Compare
    const fields = Object.keys(expectedResult);
    let correctCount = 0;
    const fieldResults: Record<string, boolean> = {};

    for (const field of fields) {
      const isMatch = String(extractionResult[field]).trim().toLowerCase() === String(expectedResult[field]).trim().toLowerCase();
      fieldResults[field] = isMatch;
      if (isMatch) correctCount++;
    }

    const accuracy = fields.length > 0 ? (correctCount / fields.length) * 100 : 0;

    return NextResponse.json({
      overallAccuracy: accuracy,
      fieldResults,
      totalFields: fields.length,
      correctFields: correctCount
    });

  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('Eval API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
