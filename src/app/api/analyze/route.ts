import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeFrame,
  analyzeBatch,
  generatePOCSuggestions,
  isGroqConfigured,
} from '@/lib/groq-analyzer';
import { getSessionFrames } from '@/lib/video-processor';

// Increase timeout for long analysis
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/analyze - Starting analysis request');

  try {
    if (!isGroqConfigured()) {
      console.log('[API] Groq API key not configured');
      return NextResponse.json(
        { error: 'Groq API key is not configured. Please set GROQ_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { sessionId, frames, mode = 'batch' } = body;

    console.log(`[API] Request params - sessionId: ${sessionId}, mode: ${mode}, frames: ${frames?.length || 'auto'}`);

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

    console.log(`[API] Will analyze ${framesToAnalyze.length} frames`);

    if (framesToAnalyze.length === 0) {
      return NextResponse.json(
        { error: 'No frames found for analysis' },
        { status: 404 }
      );
    }

    if (mode === 'single' && framesToAnalyze.length > 0) {
      // Analyze single frame
      console.log(`[API] Single frame analysis: ${framesToAnalyze[0]}`);
      const analysis = await analyzeFrame(sessionId, framesToAnalyze[0]);
      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    // Batch analysis
    console.log(`[API] Starting batch analysis of ${framesToAnalyze.length} frames...`);
    const result = await analyzeBatch(sessionId, framesToAnalyze);
    console.log(`[API] Batch analysis complete - ${result.analyzedFrames.length} frames analyzed`);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze frames' },
      { status: 500 }
    );
  }
}

// Get POC document suggestions
export async function PUT(request: NextRequest) {
  console.log('[API] PUT /api/analyze - Generating suggestions');

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

    console.log(`[API] Generating suggestions for ${analyses.length} analyses`);
    const suggestions = await generatePOCSuggestions(sessionId, analyses);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('[API] Suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
