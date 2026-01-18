import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';
import {
  extractFrames,
  getVideoMetadata,
  checkFFmpegAvailable,
  ProcessingOptions,
} from '@/lib/video-processor';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export async function POST(request: NextRequest) {
  try {
    // Check FFmpeg availability
    const ffmpegAvailable = await checkFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        { error: 'FFmpeg is not installed. Please install FFmpeg to use this feature.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fileId, filename, options } = body;

    if (!fileId || !filename) {
      return NextResponse.json(
        { error: 'Missing fileId or filename' },
        { status: 400 }
      );
    }

    const videoPath = path.join(UPLOADS_DIR, filename);

    if (!existsSync(videoPath)) {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Get video metadata
    const metadata = await getVideoMetadata(videoPath);

    // Default processing options
    const processingOptions: ProcessingOptions = {
      fps: options?.fps || 1, // 1 frame per second by default
      quality: options?.quality || 2, // High quality (1-31, lower is better)
      format: options?.format || 'jpg',
      startTime: options?.startTime,
      duration: options?.duration,
    };

    // Extract frames
    const result = await extractFrames(videoPath, processingOptions);

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      frameCount: result.frameCount,
      frames: result.frames,
      metadata: {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        codec: metadata.codec,
      },
      processingOptions,
    });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
      { status: 500 }
    );
  }
}
