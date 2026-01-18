import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';

const FRAMES_BASE_DIR = path.join(process.cwd(), 'frames');

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

  // Read image and convert to base64
  const imageBuffer = fs.readFileSync(framePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = frameName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const prompt = `You are a cybersecurity expert analyzing screenshots from a penetration test screen recording.
This is for creating a POC (Proof of Concept) document for FTTH, AirFibre, and Hotspot security testing for a telecom company.

Analyze this screenshot and determine:
1. Is this screenshot POC-worthy (shows a vulnerability, important configuration, authentication bypass, sensitive information disclosure, or critical security finding)?
2. What category does it fall into: vulnerability, configuration, authentication, network, information, or other?
3. What is shown in this screenshot?
4. If POC-worthy, what caption should be used in the security report?

Respond in JSON format ONLY (no markdown):
{
  "isPOCWorthy": boolean,
  "confidence": number (0-1),
  "reason": "brief explanation",
  "category": "vulnerability|configuration|authentication|network|information|other",
  "suggestedCaption": "caption for POC document if worthy, otherwise empty string",
  "technicalDetails": "technical details about what's shown"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    let parsed;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      // If parsing fails, create a default response
      parsed = {
        isPOCWorthy: false,
        confidence: 0.5,
        reason: content.substring(0, 200),
        category: 'other',
        suggestedCaption: '',
        technicalDetails: content,
      };
    }

    return {
      frameId: frameName,
      isPOCWorthy: parsed.isPOCWorthy || false,
      confidence: parsed.confidence || 0.5,
      reason: parsed.reason || 'Analysis completed',
      category: parsed.category || 'other',
      suggestedCaption: parsed.suggestedCaption || '',
      technicalDetails: parsed.technicalDetails,
    };
  } catch (error) {
    console.error('Groq analysis error:', error);
    throw new Error(`Failed to analyze frame: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeBatch(
  sessionId: string,
  frameNames: string[],
  onProgress?: (current: number, total: number) => void
): Promise<BatchAnalysisResult> {
  const analyzedFrames: FrameAnalysis[] = [];
  const suggestedPOCFrames: string[] = [];

  for (let i = 0; i < frameNames.length; i++) {
    try {
      const analysis = await analyzeFrame(sessionId, frameNames[i]);
      analyzedFrames.push(analysis);

      if (analysis.isPOCWorthy && analysis.confidence > 0.6) {
        suggestedPOCFrames.push(frameNames[i]);
      }

      if (onProgress) {
        onProgress(i + 1, frameNames.length);
      }

      // Rate limiting - Groq has limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to analyze frame ${frameNames[i]}:`, error);
      analyzedFrames.push({
        frameId: frameNames[i],
        isPOCWorthy: false,
        confidence: 0,
        reason: 'Analysis failed',
        category: 'other',
        suggestedCaption: '',
      });
    }
  }

  // Generate summary
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

  const summary = `Analyzed ${frameNames.length} frames. Found ${pocCount} POC-worthy screenshots. ${
    categoryBreakdown ? `Categories: ${categoryBreakdown}` : ''
  }`;

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
    return 'No POC-worthy frames found in the analyzed screenshots.';
  }

  const framesDescription = pocFrames
    .map((f, i) => `${i + 1}. ${f.frameId}: ${f.reason} (${f.category})`)
    .join('\n');

  const prompt = `Based on these pentest screenshot findings for a telecom company (FTTH, AirFibre, Hotspot),
suggest an order and structure for the POC document:

Findings:
${framesDescription}

Provide:
1. Recommended order for presenting these screenshots
2. Section groupings
3. Brief narrative flow suggestions for the POC document

Format as a clear, actionable recommendation.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content || 'Unable to generate suggestions.';
}

export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}
