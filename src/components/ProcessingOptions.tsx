'use client';

import React from 'react';
import { Settings, Zap, Image } from 'lucide-react';

interface ProcessingOptionsProps {
  options: {
    fps: number;
    quality: number;
    format: 'jpg' | 'png';
  };
  onChange: (options: {
    fps: number;
    quality: number;
    format: 'jpg' | 'png';
  }) => void;
  disabled?: boolean;
}

export default function ProcessingOptions({
  options,
  onChange,
  disabled,
}: ProcessingOptionsProps) {
  const fpsPresets = [
    { value: 0.5, label: '1 frame / 2 sec', desc: 'Overview' },
    { value: 1, label: '1 fps', desc: 'Standard' },
    { value: 2, label: '2 fps', desc: 'Detailed' },
    { value: 5, label: '5 fps', desc: 'High detail' },
  ];

  const qualityPresets = [
    { value: 2, label: 'Maximum', desc: 'Largest files' },
    { value: 5, label: 'High', desc: 'Recommended' },
    { value: 10, label: 'Medium', desc: 'Balanced' },
    { value: 15, label: 'Low', desc: 'Smallest files' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">Processing Options</h3>
      </div>

      {/* FPS Selection */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Zap className="w-4 h-4" />
          Frame Rate
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {fpsPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange({ ...options, fps: preset.value })}
              disabled={disabled}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${options.fps === preset.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="font-medium text-gray-800">{preset.label}</div>
              <div className="text-xs text-gray-500">{preset.desc}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={options.fps}
            onChange={(e) => onChange({ ...options, fps: parseFloat(e.target.value) || 1 })}
            min={0.1}
            max={30}
            step={0.1}
            disabled={disabled}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-sm text-gray-500">Custom FPS (0.1 - 30)</span>
        </div>
      </div>

      {/* Quality Selection */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Image className="w-4 h-4" />
          Image Quality
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {qualityPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange({ ...options, quality: preset.value })}
              disabled={disabled}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${options.quality === preset.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="font-medium text-gray-800">{preset.label}</div>
              <div className="text-xs text-gray-500">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">Output Format</label>
        <div className="flex gap-3">
          <button
            onClick={() => onChange({ ...options, format: 'jpg' })}
            disabled={disabled}
            className={`
              flex-1 p-3 rounded-lg border-2 transition-all
              ${options.format === 'jpg'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="font-medium text-gray-800">JPEG</div>
            <div className="text-xs text-gray-500">Smaller files, good quality</div>
          </button>
          <button
            onClick={() => onChange({ ...options, format: 'png' })}
            disabled={disabled}
            className={`
              flex-1 p-3 rounded-lg border-2 transition-all
              ${options.format === 'png'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="font-medium text-gray-800">PNG</div>
            <div className="text-xs text-gray-500">Lossless, larger files</div>
          </button>
        </div>
      </div>
    </div>
  );
}
