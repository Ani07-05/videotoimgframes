'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface FrameAnalysis {
  frameId: string;
  isPOCWorthy: boolean;
  confidence: number;
  reason: string;
  category: string;
  suggestedCaption: string;
  technicalDetails?: string;
}

interface AIAnalysisPanelProps {
  sessionId: string;
  frames: string[];
  analyses: FrameAnalysis[];
  onAnalysisComplete: (analyses: FrameAnalysis[]) => void;
  groqConfigured: boolean;
}

export default function AIAnalysisPanel({
  sessionId,
  frames,
  analyses,
  onAnalysisComplete,
  groqConfigured,
}: AIAnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Sample frames for analysis (to save API calls)
  const [sampleRate, setSampleRate] = useState(10);
  const sampledFrames = frames.filter((_, i) => i % sampleRate === 0);

  const startAnalysis = async () => {
    if (!groqConfigured) {
      setError('Groq API key is not configured. Please set GROQ_API_KEY environment variable.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setProgress({ current: 0, total: sampledFrames.length });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          frames: sampledFrames,
          mode: 'batch',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      onAnalysisComplete(data.analyzedFrames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const generateSuggestions = async () => {
    if (analyses.length === 0) return;

    setLoadingSuggestions(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          analyses,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate suggestions');
      }

      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const pocFrames = analyses.filter(a => a.isPOCWorthy);
  const categoryStats = pocFrames.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-800">AI Analysis</h3>
        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
          Powered by Groq
        </span>
      </div>

      {!groqConfigured && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Groq API not configured</p>
              <p className="text-yellow-700 text-sm mt-1">
                Add your GROQ_API_KEY to .env.local to enable AI-powered POC detection.
              </p>
              <code className="block mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-900">
                GROQ_API_KEY=your_api_key_here
              </code>
            </div>
          </div>
        </div>
      )}

      {groqConfigured && analyses.length === 0 && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Use AI to automatically identify POC-worthy screenshots from your pentest recording.
            The AI will analyze frames and suggest which ones to include in your documentation.
          </p>

          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">
              Sample rate:
              <select
                value={sampleRate}
                onChange={(e) => setSampleRate(parseInt(e.target.value))}
                className="ml-2 px-2 py-1 border border-gray-300 rounded"
                disabled={analyzing}
              >
                <option value={1}>Every frame</option>
                <option value={5}>Every 5th frame</option>
                <option value={10}>Every 10th frame</option>
                <option value={20}>Every 20th frame</option>
              </select>
            </label>
            <span className="text-sm text-gray-500">
              ({sampledFrames.length} frames to analyze)
            </span>
          </div>

          <button
            onClick={startAnalysis}
            disabled={analyzing || !groqConfigured}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing... {progress.current}/{progress.total}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Start AI Analysis
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {analyses.length > 0 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-800">{analyses.length}</div>
              <div className="text-sm text-gray-500">Analyzed</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{pocFrames.length}</div>
              <div className="text-sm text-gray-500">POC-Worthy</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((pocFrames.length / analyses.length) * 100)}%
              </div>
              <div className="text-sm text-gray-500">POC Rate</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(categoryStats).length}
              </div>
              <div className="text-sm text-gray-500">Categories</div>
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(categoryStats).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Findings by Category</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryStats).map(([category, count]) => (
                  <span
                    key={category}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                  >
                    {category}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {!suggestions && (
            <button
              onClick={generateSuggestions}
              disabled={loadingSuggestions}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {loadingSuggestions ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate POC Document Suggestions
                </>
              )}
            </button>
          )}

          {suggestions && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h4 className="text-sm font-medium text-gray-700">POC Document Suggestions</h4>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {suggestions}
                </pre>
              </div>
            </div>
          )}

          {/* Re-analyze button */}
          <button
            onClick={() => onAnalysisComplete([])}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear analysis and start over
          </button>
        </div>
      )}
    </div>
  );
}
