import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

const FRAMES_BASE_DIR = path.join(process.cwd(), 'frames');

// Parallel processing settings
const CONCURRENT_REQUESTS = 5; // Process 5 frames at a time
const MAX_FILE_SIZE_MB = 4; // Skip files larger than 4MB

export interface FrameAnalysis {
  frameId: string;
  isPOCWorthy: boolean;
  confidence: number;
  reason: string;
  category: 'vulnerability' | 'configuration' | 'authentication' | 'network' | 'information' | 'other';
  suggestedCaption: string;
  technicalDetails?: string;
}

export interface BatchAnalysisResult {
  sessionId: string;
  analyzedFrames: FrameAnalysis[];
  summary: string;
  suggestedPOCFrames: string[];
}

function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new Groq({ apiKey });
}

export async function analyzeFrame(
  sessionId: string,
  frameName: string
): Promise<FrameAnalysis> {
  const groq = getGroqClient();
  const framePath = path.join(FRAMES_BASE_DIR, sessionId, frameName);

  if (!fs.existsSync(framePath)) {
    throw new Error(`Frame not found: ${framePath}`);
  }

  // Read image
  const imageBuffer = fs.readFileSync(framePath);
  const fileSizeMB = imageBuffer.length / (1024 * 1024);

  // Skip large files
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    console.log(`[AI] · ${frameName} skipped (${fileSizeMB.toFixed(1)}MB > ${MAX_FILE_SIZE_MB}MB)`);
    return {
      frameId: frameName,
      isPOCWorthy: false,
      confidence: 0,
      reason: 'Skipped - file too large',
      category: 'other',
      suggestedCaption: '',
    };
  }

  const base64Image = imageBuffer.toString('base64');
  const mimeType = frameName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Shorter, more focused prompt for faster processing
  const prompt = `Analyze this pentest screenshot. Is it POC-worthy (shows vulnerability, auth bypass, sensitive data, or security issue)?

Reply JSON only:
{"isPOCWorthy":bool,"confidence":0-1,"reason":"brief","category":"vulnerability|authentication|configuration|network|information|other","suggestedCaption":"if worthy"}`;

  try {
    const startTime = Date.now();

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          ],
        },
      ],
      max_tokens: 256,
      temperature: 0.2,
    });

    const elapsed = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    let parsed;
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      parsed = {
        isPOCWorthy: false,
        confidence: 0.5,
        reason: content.substring(0, 100),
        category: 'other',
        suggestedCaption: '',
      };
    }

    const result = {
      frameId: frameName,
      isPOCWorthy: parsed.isPOCWorthy || false,
      confidence: parsed.confidence || 0.5,
      reason: parsed.reason || 'Analyzed',
      category: parsed.category || 'other',
      suggestedCaption: parsed.suggestedCaption || '',
      technicalDetails: parsed.technicalDetails,
    };

    const status = result.isPOCWorthy ? '✓ POC' : '·';
    console.log(`[AI] ${status} ${frameName} (${elapsed}ms)`);

    return result;
  } catch (error) {
    console.error(`[AI] ✗ ${frameName}:`, error instanceof Error ? error.message : 'Error');
    throw error;
  }
}

export async function analyzeBatch(
  sessionId: string,
  frameNames: string[],
  onProgress?: (current: number, total: number) => void
): Promise<BatchAnalysisResult> {
  console.log(`[AI] Starting PARALLEL analysis of ${frameNames.length} frames (${CONCURRENT_REQUESTS} concurrent)`);
  const startTime = Date.now();

  const analyzedFrames: FrameAnalysis[] = [];
  const suggestedPOCFrames: string[] = [];
  let completed = 0;

  // Process in parallel batches
  for (let i = 0; i < frameNames.length; i += CONCURRENT_REQUESTS) {
    const batch = frameNames.slice(i, i + CONCURRENT_REQUESTS);
    console.log(`[AI] Batch ${Math.floor(i / CONCURRENT_REQUESTS) + 1}/${Math.ceil(frameNames.length / CONCURRENT_REQUESTS)}: frames ${i + 1}-${Math.min(i + CONCURRENT_REQUESTS, frameNames.length)}`);

    const batchPromises = batch.map(async (frameName) => {
      try {
        return await analyzeFrame(sessionId, frameName);
      } catch (error) {
        return {
          frameId: frameName,
          isPOCWorthy: false,
          confidence: 0,
          reason: error instanceof Error ? error.message : 'Analysis failed',
          category: 'other' as const,
          suggestedCaption: '',
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    for (const analysis of batchResults) {
      analyzedFrames.push(analysis);
      if (analysis.isPOCWorthy && analysis.confidence > 0.6) {
        suggestedPOCFrames.push(analysis.frameId);
      }
      completed++;
    }

    if (onProgress) {
      onProgress(completed, frameNames.length);
    }

    // Small delay between batches to avoid rate limits
    if (i + CONCURRENT_REQUESTS < frameNames.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const pocCount = suggestedPOCFrames.length;
  const categories = analyzedFrames
    .filter(f => f.isPOCWorthy)
    .reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const categoryBreakdown = Object.entries(categories)
    .map(([cat, count]) => `${cat}: ${count}`)
    .join(', ');

  const summary = `Analyzed ${frameNames.length} frames in ${elapsed}s. Found ${pocCount} POC-worthy. ${categoryBreakdown || ''}`;
  console.log(`[AI] ✓ Complete: ${summary}`);

  return {
    sessionId,
    analyzedFrames,
    summary,
    suggestedPOCFrames,
  };
}

export async function generatePOCSuggestions(
  sessionId: string,
  analyses: FrameAnalysis[]
): Promise<string> {
  const groq = getGroqClient();
  const pocFrames = analyses.filter(a => a.isPOCWorthy);

  if (pocFrames.length === 0) {
    return 'No POC-worthy frames found.';
  }

  const framesDescription = pocFrames
    .map((f, i) => `${i + 1}. ${f.frameId}: ${f.reason} (${f.category})`)
    .join('\n');

  const prompt = `Pentest findings for telecom (FTTH/AirFibre/Hotspot). Suggest POC document structure:

${framesDescription}

Provide: 1) Order for screenshots 2) Section groupings 3) Brief narrative flow`;

  console.log(`[AI] Generating suggestions for ${pocFrames.length} POC frames...`);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1024,
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content || 'Unable to generate suggestions.';
}

export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}
