'use client';

import React, { useState } from 'react';
import { Download, FileArchive, FileText, Loader2 } from 'lucide-react';

interface FrameAnalysis {
  frameId: string;
  isPOCWorthy: boolean;
  confidence: number;
  reason: string;
  category: string;
  suggestedCaption: string;
  technicalDetails?: string;
}

interface ExportPanelProps {
  sessionId: string;
  selectedFrames: string[];
  analyses: FrameAnalysis[];
}

export default function ExportPanel({
  sessionId,
  selectedFrames,
  analyses,
}: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [includeAnalysis, setIncludeAnalysis] = useState(true);

  const exportFrames = async () => {
    if (selectedFrames.length === 0) return;

    setExporting(true);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          selectedFrames,
          includeAnalysis,
          analyses: includeAnalysis ? analyses : [],
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poc_frames_${sessionId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export frames. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const pocCount = selectedFrames.filter(f =>
    analyses.find(a => a.frameId === f)?.isPOCWorthy
  ).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Download className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">Export</h3>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Selected frames:</span>
          <span className="font-medium text-gray-800">{selectedFrames.length}</span>
        </div>
        {analyses.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">POC-worthy in selection:</span>
            <span className="font-medium text-green-600">{pocCount}</span>
          </div>
        )}
      </div>

      {analyses.length > 0 && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={includeAnalysis}
            onChange={(e) => setIncludeAnalysis(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Include POC Report</span>
            <p className="text-xs text-gray-500">Adds Markdown and HTML reports to the ZIP</p>
          </div>
        </label>
      )}

      <button
        onClick={exportFrames}
        disabled={exporting || selectedFrames.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
      >
        {exporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing ZIP...
          </>
        ) : (
          <>
            <FileArchive className="w-4 h-4" />
            Export as ZIP
          </>
        )}
      </button>

      {selectedFrames.length === 0 && (
        <p className="text-sm text-gray-500 text-center">
          Select frames from the gallery to export
        </p>
      )}

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          The exported ZIP will contain:
        </p>
        <ul className="text-xs text-gray-500 mt-2 space-y-1">
          <li className="flex items-center gap-2">
            <FileArchive className="w-3 h-3" />
            All selected frames in frames/ folder
          </li>
          {includeAnalysis && analyses.length > 0 && (
            <>
              <li className="flex items-center gap-2">
                <FileText className="w-3 h-3" />
                POC_Report.md - Markdown report
              </li>
              <li className="flex items-center gap-2">
                <FileText className="w-3 h-3" />
                POC_Report.html - Formatted HTML report
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
