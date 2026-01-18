'use client';

import React, { useState, useCallback } from 'react';
import { Film, Cog, Image, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import VideoUploader from '@/components/VideoUploader';
import ProcessingOptions from '@/components/ProcessingOptions';
import FrameGallery from '@/components/FrameGallery';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';
import ExportPanel from '@/components/ExportPanel';
import StatusBanner from '@/components/StatusBanner';
import { formatBytes, formatDuration } from '@/lib/utils';

interface UploadedFile {
  fileId: string;
  filename: string;
  size: number;
  originalName: string;
}

interface ProcessingResult {
  sessionId: string;
  frameCount: number;
  frames: string[];
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
    codec: string;
  };
}

interface FrameAnalysis {
  frameId: string;
  isPOCWorthy: boolean;
  confidence: number;
  reason: string;
  category: string;
  suggestedCaption: string;
  technicalDetails?: string;
}

type Step = 'upload' | 'options' | 'processing' | 'gallery';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [processingOptions, setProcessingOptions] = useState({
    fps: 1,
    quality: 5,
    format: 'jpg' as 'jpg' | 'png',
  });
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<string[]>([]);
  const [analyses, setAnalyses] = useState<FrameAnalysis[]>([]);
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = useCallback((data: UploadedFile) => {
    setUploadedFile(data);
    setStep('options');
    setError(null);
  }, []);

  const handleStatusLoaded = useCallback((status: { ffmpeg: { available: boolean }; groq: { configured: boolean } }) => {
    setGroqConfigured(status.groq.configured);
  }, []);

  const startProcessing = async () => {
    if (!uploadedFile) return;

    setProcessing(true);
    setProcessingProgress(0);
    setError(null);
    setStep('processing');

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadedFile.fileId,
          filename: uploadedFile.filename,
          options: processingOptions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      setProcessingResult(data);
      setStep('gallery');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
      setStep('options');
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setStep('upload');
    setUploadedFile(null);
    setProcessingResult(null);
    setSelectedFrames([]);
    setAnalyses([]);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Video to Image Frames</h1>
                <p className="text-sm text-gray-500">Extract frames & generate POC documentation</p>
              </div>
            </div>
            {step !== 'upload' && (
              <button
                onClick={resetAll}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Start Over
              </button>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            {[
              { key: 'upload', label: 'Upload', icon: Film },
              { key: 'options', label: 'Options', icon: Cog },
              { key: 'processing', label: 'Process', icon: Image },
              { key: 'gallery', label: 'Gallery', icon: Sparkles },
            ].map(({ key, label, icon: Icon }, index) => (
              <React.Fragment key={key}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    step === key
                      ? 'bg-blue-100 text-blue-700'
                      : index < ['upload', 'options', 'processing', 'gallery'].indexOf(step)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {index < 3 && <ArrowRight className="w-4 h-4 text-gray-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Banner */}
        <div className="mb-6">
          <StatusBanner onStatusLoaded={handleStatusLoaded} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Upload Your Video
              </h2>
              <VideoUploader onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        )}

        {/* Step: Options */}
        {step === 'options' && uploadedFile && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* File Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Selected Video</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{uploadedFile.originalName}</p>
                  <p className="text-sm text-gray-500">{formatBytes(uploadedFile.size)}</p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Processing Options */}
            <ProcessingOptions
              options={processingOptions}
              onChange={setProcessingOptions}
            />

            {/* Estimate */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Higher FPS and quality settings will produce more frames
                and larger files. For a 1-hour video at 1 FPS, expect ~3,600 frames.
              </p>
            </div>

            {/* Process Button */}
            <button
              onClick={startProcessing}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Image className="w-5 h-5" />
              Extract Frames
            </button>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Extracting Frames
              </h2>
              <p className="text-gray-500 mb-6">
                This may take a while for large videos...
              </p>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${processingProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Gallery */}
        {step === 'gallery' && processingResult && (
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Frames Extracted</p>
                  <p className="text-2xl font-bold text-gray-800">{processingResult.frameCount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Video Duration</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatDuration(processingResult.metadata.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resolution</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {processingResult.metadata.width}x{processingResult.metadata.height}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Selected</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedFrames.length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Gallery */}
              <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Frame Gallery</h2>
                <FrameGallery
                  sessionId={processingResult.sessionId}
                  frames={processingResult.frames}
                  analyses={analyses}
                  selectedFrames={selectedFrames}
                  onSelectionChange={setSelectedFrames}
                />
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* AI Analysis */}
                <AIAnalysisPanel
                  sessionId={processingResult.sessionId}
                  frames={processingResult.frames}
                  analyses={analyses}
                  onAnalysisComplete={setAnalyses}
                  groqConfigured={groqConfigured}
                />

                {/* Export */}
                <ExportPanel
                  sessionId={processingResult.sessionId}
                  selectedFrames={selectedFrames}
                  analyses={analyses}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            Video to Image Frames - Built for Pentest POC Documentation
          </p>
        </div>
      </footer>
    </main>
  );
}
