import { NextResponse } from 'next/server';
import { checkFFmpegAvailable } from '@/lib/video-processor';
import { isGroqConfigured } from '@/lib/groq-analyzer';

export async function GET() {
  const ffmpegAvailable = await checkFFmpegAvailable();
  const groqConfigured = isGroqConfigured();

  return NextResponse.json({
    ffmpeg: {
      available: ffmpegAvailable,
      message: ffmpegAvailable
        ? 'FFmpeg is installed and ready'
        : 'FFmpeg is not installed. Please install FFmpeg to extract frames.',
    },
    groq: {
      configured: groqConfigured,
      message: groqConfigured
        ? 'Groq API is configured'
        : 'Groq API key not set. Add GROQ_API_KEY to .env.local for AI analysis.',
    },
  });
}
