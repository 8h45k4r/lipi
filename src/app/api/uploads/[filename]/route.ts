import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;
    
    // Ensure no directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

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

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('File streaming error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
