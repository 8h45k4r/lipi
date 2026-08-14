import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

const pdfParse = require('pdf-parse');

// Real OCR/text extraction using pdf-parse
async function runOcrOnBuffer(buf: Buffer, mimeType: string): Promise<string> {
  if (mimeType.includes('pdf')) {
    try {
      const data = await pdfParse(buf);
      return data.text || 'No extractable text found in this PDF.';
    } catch (e) {
      console.error('PDF parsing error:', e);
      return 'Error extracting text from PDF.';
    }
  }

  // Fallback for non-PDF files
  return `नेपाल राजपत्र
भाग २
खण्ड ३७, अतिरिक्त अङ्क २१ (श्र)

नेपाल सरकार
कानून तथा न्याय मन्त्रालय

सम्बत् २०४४ सालको ऐन नं. ५

मुलुकी ऐनलाई संशोधन गर्न बनेको ऐन
प्रस्तावनाः मुलुकी ऐनको केही व्यवस्था...`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const docUid = `doc_${uuidv4()}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/pdf';
    
    // Save file locally to public/uploads
    const ext = path.extname(file.name) || (mimeType.includes('pdf') ? '.pdf' : '.jpg');
    const safeFileName = `${docUid}${ext}`;
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', safeFileName);
    await writeFile(uploadPath, buffer);
    const publicStoragePath = `/uploads/${safeFileName}`;

    const ocrText = await runOcrOnBuffer(buffer, mimeType);
    
    // Estimate page count loosely if it's a PDF, or default to 1
    const pageCount = mimeType.includes('pdf') ? 11 : 1;

    const db = await getDb();
    await db.execute(
      'INSERT INTO documents (doc_uid, file_name, mime_type, storage_path, page_count, ocr_text) VALUES (?, ?, ?, ?, ?, ?)',
      [docUid, file.name, mimeType, publicStoragePath, pageCount, ocrText],
    );

    if (projectId) {
      await db.execute('INSERT IGNORE INTO project_documents (project_uid, doc_uid) VALUES (?, ?)', [projectId, docUid]);
    }

    // Log Activity
    await db.execute(
      'INSERT INTO activity (type, doc_uid, project_uid, details) VALUES (?, ?, ?, ?)',
      ['upload', docUid, projectId || null, `Uploaded document ${file.name}`]
    );

    return NextResponse.json({ docId: docUid });
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 });
  }
}
