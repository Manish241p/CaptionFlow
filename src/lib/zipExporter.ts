import JSZip from 'jszip';

/**
 * Packs the entire CaptionFlow AI tool into a downloadable .zip archive.
 * Runs 100% client-side using JSZip and inlined sources.
 */
export async function generateProjectZip(onProgress?: (percent: number, file: string) => void): Promise<Blob> {
  const zip = new JSZip();

  // Load all source and project files via Vite's raw glob
  const sourceFiles = (import.meta as any).glob(
    [
      '/src/**/*',
      '/index.html',
      '/package.json',
      '/tsconfig.json',
      '/vite.config.ts',
      '/metadata.json',
    ],
    {
      query: '?raw',
      import: 'default',
      eager: true,
    }
  ) as Record<string, string>;

  const rootFolder = zip.folder('captionflow-ai');
  if (!rootFolder) {
    throw new Error('Could not create root zip folder');
  }

  // Add all globbed files
  const filePaths = Object.keys(sourceFiles);
  let processed = 0;

  for (const filePath of filePaths) {
    const relativePath = filePath.replace(/^\//, ''); // remove leading slash
    const content = sourceFiles[filePath];
    if (typeof content === 'string') {
      rootFolder.file(relativePath, content);
    }
    processed++;
    if (onProgress) {
      onProgress(Math.round((processed / filePaths.length) * 70), relativePath);
    }
  }

  // Add a comprehensive, clear README.md
  const readmeContent = `# CaptionFlow AI — Standalone Browser-Based Video Caption Studio
4K 60FPS Video Caption Editor with Speech Recognition, Word-Level Karaoke, 10 Styles & 16 Animations

## Features
- **4K Ultra HD & 60 FPS Export**: Full support for 3840x2160 UHD and vertical 2160x3840 reels at 60 frames per second.
- **Client-Side & Offline**: Operates 100% locally in your browser. No backend required, zero external API keys.
- **Frame-Accurate Timeline**: Trim, split, merge, duplicate, and reorder captions with sub-millisecond precision.
- **10 Dynamic Styles**: Viral, Karaoke, Minimal, Podcast, News, Cinematic, Neon, Bold Social, Corporate, Luxury.
- **16 Word Animations**: Pop, Bounce, Typewriter, Word Stagger, Blur Reveal, Elastic, Scale Punch, and more.
- **Karaoke Highlights**: Real-time spoken word scale, background badges, underlines, and custom accent fills.
- **Brand Kit & Brochure Color Picker**: EyeDropper integration and brochure image color extractor.
- **Safe Zone Presets**: 9:16 (TikTok/Reels/Shorts), 16:9, 1:1, and 4:5.
- **Subtitle & Video Export**: Instant .srt, .vtt, project .json, and burned-in .webm / .mp4 video downloads.

## How to Run Locally

### 1. Prerequisites
- Node.js (version 18 or higher)
- npm or pnpm or yarn

### 2. Setup
\`\`\`bash
# 1. Open a terminal in this extracted folder
cd captionflow-ai

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
\`\`\`

### 3. Open in Browser
Visit the URL shown in your terminal (typically **http://localhost:3000** or **http://localhost:5173**).

## Build for Production
To build a static production bundle:
\`\`\`bash
npm run build
\`\`\`
The static files will be generated in the \`dist/\` folder and can be served with any static web server (such as Nginx, Apache, or GitHub Pages).

---
Generated with CaptionFlow AI.
`;

  rootFolder.file('README.md', readmeContent);

  // Generate binary zip
  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(70 + Math.round(metadata.percent * 0.3), 'Compressing ZIP archive...');
      }
    }
  );

  return zipBlob;
}

/**
 * Trigger immediate browser download of the generated tool ZIP
 */
export async function downloadToolZip(
  onProgress?: (percent: number, msg: string) => void
): Promise<void> {
  const blob = await generateProjectZip(onProgress);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CaptionFlow-AI-Tool-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
