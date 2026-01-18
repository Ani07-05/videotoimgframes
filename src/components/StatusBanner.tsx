'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface SystemStatus {
  ffmpeg: {
    available: boolean;
    message: string;
  };
  groq: {
    configured: boolean;
    message: string;
  };
}

interface StatusBannerProps {
  onStatusLoaded?: (status: SystemStatus) => void;
}

export default function StatusBanner({ onStatusLoaded }: StatusBannerProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setStatus(data);
      onStatusLoaded?.(data);
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 flex items-center gap-3">
        <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
        <span className="text-gray-600">Checking system status...</span>
      </div>
    );
  }

  if (!status) return null;

  const allGood = status.ffmpeg.available && status.groq.configured;
  const hasWarning = !status.ffmpeg.available || !status.groq.configured;

  if (allGood) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-500" />
        <span className="text-green-700">All systems ready</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!status.ffmpeg.available && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">FFmpeg not installed</p>
            <p className="text-red-600 text-sm mt-1">
              FFmpeg is required to extract frames from videos. Install it using:
            </p>
            <div className="mt-2 space-y-1">
              <code className="block p-2 bg-red-100 rounded text-xs text-red-900">
                # Ubuntu/Debian: sudo apt install ffmpeg
              </code>
              <code className="block p-2 bg-red-100 rounded text-xs text-red-900">
                # macOS: brew install ffmpeg
              </code>
              <code className="block p-2 bg-red-100 rounded text-xs text-red-900">
                # Windows: Download from ffmpeg.org
              </code>
            </div>
          </div>
        </div>
      )}

      {!status.groq.configured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-700 font-medium">Groq API not configured</p>
            <p className="text-yellow-600 text-sm mt-1">
              AI analysis is optional but requires a Groq API key. Get one free at{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline">
                console.groq.com
              </a>
            </p>
            <code className="block mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-900">
              # Add to .env.local: GROQ_API_KEY=your_api_key_here
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
