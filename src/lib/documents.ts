import { getDb } from './db';

export class DocumentNotFoundError extends Error {}

/** Fetch a document's OCR text + page count, scoped to the owning user. */
export async function getDocForOwner(
  docUid: string,
  ownerId: string,
): Promise<{ ocrText: string; pageCount: number }> {
  const db = await getDb();
  const [rows] = await db.execute(
    'SELECT ocr_text, page_count FROM documents WHERE doc_uid = ? AND owner_id = ?',
    [docUid, ownerId],
  );
  const row = (rows as any[])[0];
  if (!row) throw new DocumentNotFoundError('Document not found');
  return { ocrText: row.ocr_text as string, pageCount: (row.page_count as number) || 1 };
}
