'use client';

import React, { useState, useEffect } from 'react';
import { Check, ZoomIn, Sparkles, Download, Filter } from 'lucide-react';

interface FrameAnalysis {
  frameId: string;
  isPOCWorthy: boolean;
  confidence: number;
  reason: string;
  category: string;
  suggestedCaption: string;
  technicalDetails?: string;
}

interface FrameGalleryProps {
  sessionId: string;
  frames: string[];
  analyses?: FrameAnalysis[];
  selectedFrames: string[];
  onSelectionChange: (selected: string[]) => void;
  onFrameClick?: (frame: string) => void;
}

type FilterMode = 'all' | 'poc' | 'selected';

export default function FrameGallery({
  sessionId,
  frames,
  analyses = [],
  selectedFrames,
  onSelectionChange,
  onFrameClick,
}: FrameGalleryProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [zoomedFrame, setZoomedFrame] = useState<string | null>(null);

  const getAnalysis = (frame: string) => analyses.find(a => a.frameId === frame);

  const filteredFrames = frames.filter(frame => {
    if (filterMode === 'all') return true;
    if (filterMode === 'selected') return selectedFrames.includes(frame);
    if (filterMode === 'poc') {
      const analysis = getAnalysis(frame);
      return analysis?.isPOCWorthy;
    }
    return true;
  });

  const toggleFrame = (frame: string) => {
    if (selectedFrames.includes(frame)) {
      onSelectionChange(selectedFrames.filter(f => f !== frame));
    } else {
      onSelectionChange([...selectedFrames, frame]);
    }
  };

  const selectAllPOC = () => {
    const pocFrames = frames.filter(frame => {
      const analysis = getAnalysis(frame);
      return analysis?.isPOCWorthy;
    });
    onSelectionChange([...new Set([...selectedFrames, ...pocFrames])]);
  };

  const selectAll = () => {
    onSelectionChange([...frames]);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      vulnerability: 'bg-red-500',
      authentication: 'bg-orange-500',
      configuration: 'bg-blue-500',
      network: 'bg-green-500',
      information: 'bg-purple-500',
      other: 'bg-gray-500',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-sm ${
                filterMode === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All ({frames.length})
            </button>
            <button
              onClick={() => setFilterMode('poc')}
              className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                filterMode === 'poc' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              POC ({analyses.filter(a => a.isPOCWorthy).length})
            </button>
            <button
              onClick={() => setFilterMode('selected')}
              className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
                filterMode === 'selected' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Selected ({selectedFrames.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {analyses.length > 0 && (
            <button
              onClick={selectAllPOC}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              <Sparkles className="w-4 h-4" />
              Select POC
            </button>
          )}
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Frame Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredFrames.map((frame, index) => {
          const analysis = getAnalysis(frame);
          const isSelected = selectedFrames.includes(frame);

          return (
            <div
              key={frame}
              className={`
                relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer
                ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
                ${analysis?.isPOCWorthy ? 'ring-2 ring-yellow-300' : ''}
              `}
              onClick={() => toggleFrame(frame)}
            >
              {/* Image */}
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={`/api/frames/${sessionId}/${frame}`}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Selection overlay */}
                {isSelected && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="p-2 bg-blue-500 rounded-full">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}

                {/* POC indicator */}
                {analysis?.isPOCWorthy && (
                  <div className="absolute top-2 left-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium text-white ${getCategoryColor(analysis.category)}`}>
                      {analysis.category}
                    </div>
                  </div>
                )}

                {/* Confidence badge */}
                {analysis && analysis.isPOCWorthy && (
                  <div className="absolute top-2 right-2">
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-400 rounded text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      {Math.round(analysis.confidence * 100)}%
                    </div>
                  </div>
                )}

                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedFrame(frame);
                    }}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                  >
                    <ZoomIn className="w-5 h-5 text-gray-700" />
                  </button>
                  <a
                    href={`/api/frames/${sessionId}/${frame}`}
                    download={frame}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                  >
                    <Download className="w-5 h-5 text-gray-700" />
                  </a>
                </div>
              </div>

              {/* Frame info */}
              <div className="p-2 bg-white">
                <p className="text-xs text-gray-600 truncate">{frame}</p>
                {analysis && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {analysis.isPOCWorthy ? analysis.suggestedCaption || analysis.reason : 'Not POC-worthy'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredFrames.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No frames match the current filter
        </div>
      )}

      {/* Zoom Modal */}
      {zoomedFrame && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomedFrame(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={`/api/frames/${sessionId}/${zoomedFrame}`}
              alt="Zoomed frame"
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setZoomedFrame(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
            >
              <ZoomIn className="w-6 h-6 text-white" />
            </button>

            {/* Analysis info in modal */}
            {getAnalysis(zoomedFrame)?.isPOCWorthy && (
              <div className="absolute bottom-4 left-4 right-4 p-4 bg-black/80 rounded-lg">
                <p className="text-white font-medium">{getAnalysis(zoomedFrame)?.suggestedCaption}</p>
                <p className="text-gray-300 text-sm mt-1">{getAnalysis(zoomedFrame)?.reason}</p>
                {getAnalysis(zoomedFrame)?.technicalDetails && (
                  <p className="text-gray-400 text-xs mt-2">{getAnalysis(zoomedFrame)?.technicalDetails}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
