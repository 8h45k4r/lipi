import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { getEnv } from '@/lib/env';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const env = getEnv();
    const resolvedParams = await params;
    const filename = resolvedParams.filename;

    // Ensure no directory traversal
    const safeFilename = path.basename(filename);
    const uploadDir = path.isAbsolute(env.UPLOAD_DIR)
      ? env.UPLOAD_DIR
      : path.join(process.cwd(), env.UPLOAD_DIR);
    const filePath = path.join(uploadDir, safeFilename);

    try {
      await stat(filePath);
    } catch (e) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    let mimeType = 'application/octet-stream';
    if (safeFilename.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (safeFilename.endsWith('.jpg') || safeFilename.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (safeFilename.endsWith('.png')) {
      mimeType = 'image/png';
    }

    // Uploaded documents may contain PII — never allow shared/CDN caching.
    // NOTE: this route is not yet access-controlled; per-user authorization
    // is added with the auth work (see AUDIT.md C2/C3).
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    console.error('File streaming error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
