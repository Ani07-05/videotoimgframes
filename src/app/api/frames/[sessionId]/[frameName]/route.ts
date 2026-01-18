import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getFramePath } from '@/lib/video-processor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; frameName: string }> }
) {
  try {
    const { sessionId, frameName } = await params;

    if (!sessionId || !frameName) {
      return NextResponse.json(
        { error: 'Session ID and frame name are required' },
        { status: 400 }
      );
    }

    const framePath = getFramePath(sessionId, frameName);

    if (!existsSync(framePath)) {
      return NextResponse.json(
        { error: 'Frame not found' },
        { status: 404 }
      );
    }

    const imageBuffer = await readFile(framePath);
    const contentType = frameName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving frame:', error);
    return NextResponse.json(
      { error: 'Failed to serve frame' },
      { status: 500 }
    );
  }
}
