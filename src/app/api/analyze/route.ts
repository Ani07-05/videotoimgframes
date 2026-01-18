import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeFrame,
  analyzeBatch,
  generatePOCSuggestions,
  isGroqConfigured,
} from '@/lib/groq-analyzer';
import { getSessionFrames } from '@/lib/video-processor';

export async function POST(request: NextRequest) {
  try {
    if (!isGroqConfigured()) {
      return NextResponse.json(
        { error: 'Groq API key is not configured. Please set GROQ_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { sessionId, frames, mode = 'batch' } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get frames to analyze
    let framesToAnalyze: string[] = frames;
    if (!framesToAnalyze || framesToAnalyze.length === 0) {
      framesToAnalyze = getSessionFrames(sessionId);
    }

    if (framesToAnalyze.length === 0) {
      return NextResponse.json(
        { error: 'No frames found for analysis' },
        { status: 404 }
      );
    }

    if (mode === 'single' && framesToAnalyze.length > 0) {
      // Analyze single frame
      const analysis = await analyzeFrame(sessionId, framesToAnalyze[0]);
      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    // Batch analysis
    const result = await analyzeBatch(sessionId, framesToAnalyze);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze frames' },
      { status: 500 }
    );
  }
}

// Get POC document suggestions
export async function PUT(request: NextRequest) {
  try {
    if (!isGroqConfigured()) {
      return NextResponse.json(
        { error: 'Groq API key is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { sessionId, analyses } = body;

    if (!sessionId || !analyses) {
      return NextResponse.json(
        { error: 'Session ID and analyses are required' },
        { status: 400 }
      );
    }

    const suggestions = await generatePOCSuggestions(sessionId, analyses);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
