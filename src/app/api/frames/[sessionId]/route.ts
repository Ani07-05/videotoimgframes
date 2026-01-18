import { NextRequest, NextResponse } from 'next/server';
import { getSessionFrames } from '@/lib/video-processor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const frames = getSessionFrames(sessionId);

    if (frames.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or no frames available' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sessionId,
      frames,
      count: frames.length,
    });
  } catch (error) {
    console.error('Error fetching frames:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frames' },
      { status: 500 }
    );
  }
}
