import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getFramePath, getSessionFrames } from '@/lib/video-processor';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, selectedFrames, includeAnalysis, analyses } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get frames to export
    let framesToExport: string[] = selectedFrames;
    if (!framesToExport || framesToExport.length === 0) {
      framesToExport = getSessionFrames(sessionId);
    }

    if (framesToExport.length === 0) {
      return NextResponse.json(
        { error: 'No frames to export' },
        { status: 404 }
      );
    }

    const zip = new JSZip();

    // Add frames to zip
    for (const frameName of framesToExport) {
      const framePath = getFramePath(sessionId, frameName);
      if (existsSync(framePath)) {
        const imageBuffer = await readFile(framePath);
        zip.file(`frames/${frameName}`, imageBuffer);
      }
    }

    // Add analysis report if requested
    if (includeAnalysis && analyses && analyses.length > 0) {
      const report = generateMarkdownReport(analyses, framesToExport);
      zip.file('POC_Report.md', report);

      // Also generate HTML version
      const htmlReport = generateHTMLReport(analyses, framesToExport);
      zip.file('POC_Report.html', htmlReport);
    }

    // Generate zip as blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    return new Response(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="poc_frames_${sessionId.slice(0, 8)}.zip"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export frames' },
      { status: 500 }
    );
  }
}

function generateMarkdownReport(analyses: Array<{
  frameId: string;
  isPOCWorthy: boolean;
  reason: string;
  category: string;
  suggestedCaption: string;
  technicalDetails?: string;
}>, selectedFrames: string[]): string {
  const pocAnalyses = analyses.filter(a =>
    selectedFrames.includes(a.frameId) && a.isPOCWorthy
  );

  let markdown = `# Penetration Test POC Report

## Executive Summary

This document contains ${selectedFrames.length} screenshots from the penetration test recording.
${pocAnalyses.length} frames were identified as POC-worthy findings.

---

## Findings

`;

  // Group by category
  const categories = ['vulnerability', 'authentication', 'configuration', 'network', 'information', 'other'];

  for (const category of categories) {
    const categoryFrames = pocAnalyses.filter(a => a.category === category);
    if (categoryFrames.length === 0) continue;

    markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Findings\n\n`;

    for (const analysis of categoryFrames) {
      markdown += `#### ${analysis.suggestedCaption || analysis.frameId}\n\n`;
      markdown += `![${analysis.frameId}](frames/${analysis.frameId})\n\n`;
      markdown += `**Description:** ${analysis.reason}\n\n`;
      if (analysis.technicalDetails) {
        markdown += `**Technical Details:** ${analysis.technicalDetails}\n\n`;
      }
      markdown += `---\n\n`;
    }
  }

  // Add non-POC frames at the end
  const nonPocFrames = selectedFrames.filter(f => !pocAnalyses.some(a => a.frameId === f));
  if (nonPocFrames.length > 0) {
    markdown += `## Additional Screenshots\n\n`;
    for (const frame of nonPocFrames) {
      markdown += `![${frame}](frames/${frame})\n\n`;
    }
  }

  return markdown;
}

function generateHTMLReport(analyses: Array<{
  frameId: string;
  isPOCWorthy: boolean;
  reason: string;
  category: string;
  suggestedCaption: string;
  technicalDetails?: string;
  confidence?: number;
}>, selectedFrames: string[]): string {
  const pocAnalyses = analyses.filter(a =>
    selectedFrames.includes(a.frameId) && a.isPOCWorthy
  );

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Penetration Test POC Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #1a1a1a; border-bottom: 3px solid #dc2626; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 40px; }
    h3 { color: #4b5563; }
    .finding {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #dc2626;
    }
    .finding img {
      max-width: 100%;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    .finding h4 { margin-top: 0; color: #111827; }
    .category-tag {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .category-vulnerability { background: #fee2e2; color: #dc2626; }
    .category-authentication { background: #fef3c7; color: #d97706; }
    .category-configuration { background: #dbeafe; color: #2563eb; }
    .category-network { background: #d1fae5; color: #059669; }
    .category-information { background: #e0e7ff; color: #4f46e5; }
    .category-other { background: #f3f4f6; color: #6b7280; }
    .summary {
      background: #1f2937;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .technical-details {
      background: #f9fafb;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>🔐 Penetration Test POC Report</h1>

  <div class="summary">
    <h2 style="color: white; margin-top: 0;">Executive Summary</h2>
    <p>Total Screenshots: <strong>${selectedFrames.length}</strong></p>
    <p>POC-Worthy Findings: <strong>${pocAnalyses.length}</strong></p>
  </div>

  <h2>Findings</h2>
`;

  const categories = ['vulnerability', 'authentication', 'configuration', 'network', 'information', 'other'];

  for (const category of categories) {
    const categoryFrames = pocAnalyses.filter(a => a.category === category);
    if (categoryFrames.length === 0) continue;

    html += `<h3>${category.charAt(0).toUpperCase() + category.slice(1)} Findings (${categoryFrames.length})</h3>`;

    for (const analysis of categoryFrames) {
      html += `
  <div class="finding">
    <span class="category-tag category-${analysis.category}">${analysis.category}</span>
    <h4>${analysis.suggestedCaption || analysis.frameId}</h4>
    <img src="frames/${analysis.frameId}" alt="${analysis.frameId}">
    <p><strong>Description:</strong> ${analysis.reason}</p>
    ${analysis.technicalDetails ? `<div class="technical-details"><strong>Technical Details:</strong><br>${analysis.technicalDetails}</div>` : ''}
  </div>`;
    }
  }

  html += `
</body>
</html>`;

  return html;
}
