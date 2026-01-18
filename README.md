# Video to Image Frames

A web application to convert large screen recording videos into image sequences with AI-powered POC (Proof of Concept) screenshot detection. Built for pentest documentation workflows.

## Features

- **Large Video Support**: Handle videos up to 5GB (screen recordings, pentest sessions)
- **Configurable Frame Extraction**: Adjust FPS, quality, and output format (JPEG/PNG)
- **AI-Powered Analysis**: Uses Groq's Llama Vision models to automatically identify POC-worthy screenshots
- **Smart Categorization**: Automatically categorizes findings (vulnerability, authentication, configuration, network, information)
- **Frame Gallery**: Browse, select, and manage extracted frames with filtering
- **Export Options**: Download selected frames as ZIP with auto-generated POC reports (Markdown & HTML)

## Prerequisites

### Required
- **Node.js** 18+
- **FFmpeg** - Required for video processing

Install FFmpeg:
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Optional
- **Groq API Key** - For AI-powered screenshot analysis (free tier available)

## Getting Started

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd videotoimgframes
   npm install
   ```

2. **Configure environment** (optional, for AI features)
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your GROQ_API_KEY
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Upload Video
- Drag and drop or click to upload your screen recording
- Supports MP4, WebM, MOV, AVI, MKV formats up to 5GB

### 2. Configure Processing
- **Frame Rate**: Choose how many frames per second to extract
  - 0.5 FPS (1 frame/2 sec) - Quick overview
  - 1 FPS - Standard (recommended)
  - 2-5 FPS - Detailed capture
- **Quality**: Maximum, High, Medium, or Low
- **Format**: JPEG (smaller files) or PNG (lossless)

### 3. Extract Frames
Click "Extract Frames" and wait for processing. For large videos, this may take several minutes.

### 4. Browse & Select Frames
- View all extracted frames in the gallery
- Click frames to select/deselect for export
- Use filters to show all, POC-worthy, or selected frames

### 5. AI Analysis (Optional)
If Groq API is configured:
- Click "Start AI Analysis" to analyze frames
- AI identifies POC-worthy screenshots for your security documentation
- Frames are categorized by finding type
- Confidence scores help prioritize important screenshots

### 6. Export
- Select frames you want to export
- Choose to include AI-generated POC report
- Download as ZIP containing:
  - All selected frames
  - `POC_Report.md` - Markdown report
  - `POC_Report.html` - Formatted HTML report

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload video file |
| `/api/process` | POST | Extract frames from uploaded video |
| `/api/frames/[sessionId]` | GET | List frames for a session |
| `/api/frames/[sessionId]/[frameName]` | GET | Serve individual frame |
| `/api/analyze` | POST | AI analysis of frames |
| `/api/analyze` | PUT | Generate POC document suggestions |
| `/api/export` | POST | Export frames as ZIP |
| `/api/status` | GET | Check system status (FFmpeg, Groq) |

## Project Structure

```
videotoimgframes/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── page.tsx      # Main application
│   │   └── layout.tsx    # App layout
│   ├── components/       # React components
│   │   ├── VideoUploader.tsx
│   │   ├── ProcessingOptions.tsx
│   │   ├── FrameGallery.tsx
│   │   ├── AIAnalysisPanel.tsx
│   │   ├── ExportPanel.tsx
│   │   └── StatusBanner.tsx
│   └── lib/              # Utilities
│       ├── video-processor.ts  # FFmpeg integration
│       ├── groq-analyzer.ts    # Groq AI integration
│       └── utils.ts            # Helper functions
├── uploads/              # Uploaded videos (gitignored)
├── frames/               # Extracted frames (gitignored)
└── package.json
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **Video Processing**: FFmpeg via fluent-ffmpeg
- **AI**: Groq API with Llama 3.2 Vision
- **Icons**: Lucide React

## Use Case

This tool was built specifically for:
- Converting pentest screen recordings to documentation
- FTTH, AirFibre, and Hotspot security testing documentation
- Creating POC documents for telecom security assessments
- Any workflow requiring frame extraction from large video files

## License

MIT
