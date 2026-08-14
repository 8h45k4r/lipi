import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Allowed upload types -> canonical extension. `file.type` is attacker
// controlled, so we also sniff magic bytes below and only ever derive the
// on-disk extension from this map, never from the client-supplied filename.
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 5 && buf.toString('latin1', 0, 5) === '%PDF-') return 'application/pdf';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

// Real OCR/text extraction using pdf-parse. Required lazily inside the handler
// so the module's canvas/DOMMatrix dependency doesn't break `next build`.
async function runOcrOnBuffer(buf: Buffer, mimeType: string): Promise<{ text: string; pageCount: number }> {
  if (mimeType === 'application/pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buf);
      return {
        text: data.text || 'No extractable text found in this PDF.',
        pageCount: typeof data.numpages === 'number' && data.numpages > 0 ? data.numpages : 1,
      };
    } catch (e) {
      console.error('PDF parsing error:', e);
      return { text: 'Error extracting text from PDF.', pageCount: 1 };
    }
  }

  // Image OCR is not wired up yet; store an empty result rather than
  // fabricating document text.
  return { text: '', pageCount: 1 };
}

export async function POST(req: NextRequest) {
  const env = getEnv();
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > env.MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the maximum allowed size of ${env.MAX_UPLOAD_BYTES} bytes.` },
        { status: 413 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Trust content sniffing, not the client-supplied MIME/extension.
    const sniffed = sniffMime(buffer);
    if (!sniffed || !ALLOWED_TYPES[sniffed]) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only PDF, JPEG, and PNG are accepted.' },
        { status: 415 },
      );
    }
    const mimeType = sniffed;
    const ext = ALLOWED_TYPES[mimeType];

    const docUid = `doc_${uuidv4()}`;
    const safeFileName = `${docUid}${ext}`;

    // Store OUTSIDE public/ so the file is never served statically; the only
    // read path is the authorized /api/uploads route.
    const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
      ? env.UPLOAD_DIR
      : path.join(process.cwd(), env.UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeFileName), buffer);
    const publicStoragePath = `/uploads/${safeFileName}`;

    const { text: ocrText, pageCount } = await runOcrOnBuffer(buffer, mimeType);

    const db = await getDb();
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        'INSERT INTO documents (doc_uid, file_name, mime_type, storage_path, page_count, ocr_text) VALUES (?, ?, ?, ?, ?, ?)',
        [docUid, file.name, mimeType, publicStoragePath, pageCount, ocrText],
      );
      if (projectId) {
        await conn.execute(
          'INSERT IGNORE INTO project_documents (project_uid, doc_uid) VALUES (?, ?)',
          [projectId, docUid],
        );
      }
      await conn.execute(
        'INSERT INTO activity (type, doc_uid, project_uid, details) VALUES (?, ?, ?, ?)',
        ['upload', docUid, projectId || null, `Uploaded document ${file.name}`],
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({ docId: docUid });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
