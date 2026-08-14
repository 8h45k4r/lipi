import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const [rows] = await db.query('SELECT role, content FROM chat_messages ORDER BY created_at ASC');
    return NextResponse.json({ messages: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { messages, docId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    const db = await getDb();
    const userMessage = messages[messages.length - 1];
    
    // Save User Message
    if (userMessage.role === 'user') {
      await db.execute('INSERT INTO chat_messages (role, content) VALUES (?, ?)', ['user', userMessage.content]);
    }

    let systemContext = "You are Lipi AI, a helpful assistant for analyzing documents.";

    if (docId) {
      const [rows]: any = await db.query('SELECT ocr_text FROM documents WHERE doc_uid = ?', [docId]);
      if (rows.length > 0 && rows[0].ocr_text) {
        systemContext += `\n\n<Document OCR TEXT>\n${rows[0].ocr_text}\n</Document OCR TEXT>`;
      }
    }

    const payload = {
      model: "gemma4:12b",
      messages: [
        { role: "system", content: systemContext },
        ...messages
      ],
      stream: false
    };

    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama Error:', errorText);
      return NextResponse.json({ error: 'Failed to communicate with AI model' }, { status: 500 });
    }

    const data = await response.json();
    
    // Save Assistant Message
    await db.execute('INSERT INTO chat_messages (role, content) VALUES (?, ?)', ['assistant', data.message.content]);

    return NextResponse.json({ message: data.message });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
