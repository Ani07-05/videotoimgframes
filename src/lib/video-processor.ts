import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface ProcessingOptions {
  fps: number; // frames per second to extract
  quality: number; // 1-31, lower is better quality
  format: 'jpg' | 'png';
  startTime?: number; // optional start time in seconds
  duration?: number; // optional duration in seconds
}

export interface ProcessingResult {
  sessionId: string;
  framesDir: string;
  frameCount: number;
  frames: string[];
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size: number;
}

const FRAMES_BASE_DIR = path.join(process.cwd(), 'frames');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure directories exist
if (!fs.existsSync(FRAMES_BASE_DIR)) {
  fs.mkdirSync(FRAMES_BASE_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to get video metadata: ${err.message}`));
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      const fps = videoStream.r_frame_rate
        ? eval(videoStream.r_frame_rate)
        : 30;

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: Math.round(fps),
        codec: videoStream.codec_name || 'unknown',
        size: metadata.format.size || 0,
      });
    });
  });
}

export async function extractFrames(
  videoPath: string,
  options: ProcessingOptions,
  onProgress?: (percent: number) => void
): Promise<ProcessingResult> {
  const sessionId = uuidv4();
  const framesDir = path.join(FRAMES_BASE_DIR, sessionId);

  // Create session directory
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  const outputPattern = path.join(framesDir, `frame_%06d.${options.format}`);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=${options.fps}`,
        `-q:v ${options.quality}`,
      ])
      .output(outputPattern);

    if (options.startTime !== undefined) {
      command = command.setStartTime(options.startTime);
    }

    if (options.duration !== undefined) {
      command = command.setDuration(options.duration);
    }

    command
      .on('start', (cmd) => {
        console.log('FFmpeg started:', cmd);
      })
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(Math.min(progress.percent, 100));
        }
      })
      .on('end', () => {
        // Get list of generated frames
        const frames = fs.readdirSync(framesDir)
          .filter(f => f.startsWith('frame_'))
          .sort();

        resolve({
          sessionId,
          framesDir,
          frameCount: frames.length,
          frames,
        });
      })
      .on('error', (err) => {
        // Cleanup on error
        if (fs.existsSync(framesDir)) {
          fs.rmSync(framesDir, { recursive: true, force: true });
        }
        reject(new Error(`Frame extraction failed: ${err.message}`));
      })
      .run();
  });
}

export function getFramePath(sessionId: string, frameName: string): string {
  return path.join(FRAMES_BASE_DIR, sessionId, frameName);
}

export function getSessionFrames(sessionId: string): string[] {
  const framesDir = path.join(FRAMES_BASE_DIR, sessionId);
  if (!fs.existsSync(framesDir)) {
    return [];
  }
  return fs.readdirSync(framesDir)
    .filter(f => f.startsWith('frame_'))
    .sort();
}

export function deleteSession(sessionId: string): void {
  const framesDir = path.join(FRAMES_BASE_DIR, sessionId);
  if (fs.existsSync(framesDir)) {
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

export function checkFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}
