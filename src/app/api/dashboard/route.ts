import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, UnauthorizedError, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireUser();
    const db = await getDb();
    const owner = user.userId;

    // Total documents (owner-scoped)
    const [docRows] = await db.query('SELECT COUNT(*) as count FROM documents WHERE owner_id = ?', [owner]);
    const totalDocuments = (docRows as any[])[0].count;

    // Active pipelines — case-insensitive status, owner-scoped
    const [pipelineRows] = await db.query(
      "SELECT COUNT(*) as count FROM pipelines WHERE LOWER(status) = 'active' AND owner_id = ?",
      [owner],
    );
    const activePipelines = (pipelineRows as any[])[0]?.count || 0;

    // Tokens used across the owner's extractions
    const [tokenRows] = await db.query(
      `SELECT SUM(e.prompt_tokens + e.completion_tokens) as tokens
       FROM extractions e JOIN documents d ON e.doc_uid = d.doc_uid
       WHERE d.owner_id = ?`,
      [owner],
    );
    const creditsUsed = (tokenRows as any[])[0]?.tokens || 0;
    const totalCredits = 1000000;

    // Success rate from the owner's feedback, falling back to completion ratio
    let successRate = 0;
    const [feedbackRows] = await db.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN f.value = 'up' THEN 1 ELSE 0 END) as positive
       FROM feedback f JOIN documents d ON f.doc_uid = d.doc_uid
       WHERE d.owner_id = ?`,
      [owner],
    );
    const totalFeedback = (feedbackRows as any[])[0]?.total || 0;
    const positiveFeedback = (feedbackRows as any[])[0]?.positive || 0;
    if (totalFeedback > 0) {
      successRate = Number(((positiveFeedback / totalFeedback) * 100).toFixed(1));
    } else {
      const [docStats] = await db.query(
        `SELECT COUNT(*) as totalDocs,
           SUM(CASE WHEN (SELECT COUNT(*) FROM extractions e WHERE e.doc_uid = d.doc_uid) > 0 THEN 1 ELSE 0 END) as completedDocs
         FROM documents d WHERE d.owner_id = ?`,
        [owner],
      );
      const totalDocs = (docStats as any[])[0]?.totalDocs || 0;
      const completedDocs = (docStats as any[])[0]?.completedDocs || 0;
      if (totalDocs > 0) {
        successRate = Number(((completedDocs / totalDocs) * 100).toFixed(1));
      }
    }

    // Recent documents (owner-scoped)
    const [recentDocs] = await db.query(
      `SELECT d.id, d.doc_uid as docUid, d.file_name as name,
        (SELECT COUNT(*) FROM extractions e WHERE e.doc_uid = d.doc_uid) as extractionCount,
        d.created_at as date
       FROM documents d
       WHERE d.owner_id = ?
       ORDER BY d.created_at DESC
       LIMIT 4`,
      [owner],
    );
    const formattedRecentDocs = (recentDocs as any[]).map((doc) => ({
      id: doc.docUid,
      name: doc.name,
      status: doc.extractionCount > 0 ? 'Completed' : 'Queued',
      date: new Date(doc.date).toLocaleDateString(),
    }));

    // Pending reviews (low confidence), owner-scoped; fixed project join (was
    // joining project_uid to the numeric projects.id).
    const [pendingReviewRows] = await db.query(
      `SELECT e.doc_uid as id, d.file_name as name, e.confidence_score as confidence, p.name as project
       FROM extractions e
       JOIN documents d ON e.doc_uid = d.doc_uid
       LEFT JOIN project_documents pd ON d.doc_uid = pd.doc_uid
       LEFT JOIN projects p ON pd.project_uid = p.project_uid
       WHERE d.owner_id = ? AND (e.confidence_score < 0.90 OR e.confidence_score IS NULL)
       ORDER BY e.id DESC
       LIMIT 4`,
      [owner],
    );
    const formattedPendingReviews = (pendingReviewRows as any[]).map((review) => ({
      id: review.id,
      name: review.name,
      reason:
        review.confidence === null
          ? 'Confidence score unavailable'
          : 'Low confidence extraction requiring manual validation',
      confidence: review.confidence !== null ? `${(review.confidence * 100).toFixed(1)}% conf` : 'N/A conf',
      project: review.project || 'Unassigned',
    }));

    return NextResponse.json({
      metrics: {
        totalDocuments,
        activePipelines,
        successRate,
        credits: { used: creditsUsed, total: totalCredits },
      },
      recentDocuments: formattedRecentDocs,
      pendingReviews: formattedPendingReviews,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
