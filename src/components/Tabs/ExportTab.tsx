import React, { useState } from 'react';
import { Caption, BrandKit, SafeZonePreset, ExportResolution, ExportFps, VideoMetadata } from '../../types';
import { SRTParser } from '../../lib/srt';
import { VTTParser } from '../../lib/vtt';
import { ProjectStorage } from '../../lib/storage';
import { VideoExporter } from '../../lib/exporter';
import { downloadToolZip } from '../../lib/zipExporter';
import {
  Download,
  FileText,
  FileCode,
  FileJson,
  Film,
  AlertCircle,
  Loader2,
  XCircle,
  Archive,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface ExportTabProps {
  captions: Caption[];
  brandKit: BrandKit;
  safeZone: SafeZonePreset;
  safeMarginX: number;
  safeMarginY: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoMetadata: VideoMetadata | null;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const ExportTab: React.FC<ExportTabProps> = ({
  captions,
  brandKit,
  safeZone,
  safeMarginX,
  safeMarginY,
  videoRef,
  videoMetadata,
  onToast,
}) => {
  const [resolution, setResolution] = useState<ExportResolution>('4k');
  const [fps, setFps] = useState<ExportFps>(60);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Tool ZIP export state
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);

  // Check supported export format
  const supportedMime = VideoExporter.getSupportedMimeType();

  // Export SRT
  const handleExportSRT = () => {
    if (captions.length === 0) {
      onToast('warning', 'No captions to export.');
      return;
    }
    const content = SRTParser.stringify(captions);
    SRTParser.downloadSRT(content, 'captionflow_captions.srt');
    onToast('success', 'Exported captionflow_captions.srt');
  };

  // Export VTT
  const handleExportVTT = () => {
    if (captions.length === 0) {
      onToast('warning', 'No captions to export.');
      return;
    }
    const content = VTTParser.stringify(captions);
    VTTParser.downloadVTT(content, 'captionflow_captions.vtt');
    onToast('success', 'Exported captionflow_captions.vtt');
  };

  // Export Project JSON
  const handleExportJSON = () => {
    const project = ProjectStorage.createProjectData({
      name: videoMetadata ? `CaptionFlow_${videoMetadata.name.replace(/\.[^/.]+$/, '')}` : 'CaptionFlow_Project',
      captions,
      brandKit,
      safeZone,
      safeMarginX,
      safeMarginY,
    });
    ProjectStorage.downloadProjectJSON(project, `${project.name}.json`);
    onToast('success', `Exported ${project.name}.json`);
  };

  // Export Burned-in Video (4K 60FPS enabled)
  const handleExportVideo = async () => {
    const video = videoRef.current;
    if (!video || !video.src) {
      onToast('error', 'Please load a video first before exporting.');
      return;
    }

    if (captions.length === 0) {
      onToast('warning', 'No captions to burn into video.');
    }

    setIsExportingVideo(true);
    setExportProgress(0);
    setStatusMsg(`Rendering ${resolution.toUpperCase()} @ ${fps}fps...`);

    try {
      onToast('info', `Rendering ${resolution.toUpperCase()} ${fps}fps video. Please keep this tab open...`);
      const blobUrl = await VideoExporter.exportVideo({
        videoElement: video,
        captions,
        safeZone,
        safeMarginX,
        safeMarginY,
        resolution,
        fps,
        onProgress: (progress) => {
          setExportProgress(progress);
        },
        onStatus: (msg) => {
          setStatusMsg(msg);
        },
      });

      const filename = `captionflow_${resolution}_${fps}fps.webm`;
      onToast('success', `Video export complete! Downloaded ${filename}`);
    } catch (err: any) {
      onToast('error', `Video export stopped: ${err.message}`);
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
      setStatusMsg('');
    }
  };

  const handleCancelExport = () => {
    VideoExporter.cancel();
    onToast('info', 'Video export cancelled.');
  };

  // Download complete tool ZIP package
  const handleDownloadZip = async () => {
    setIsZipping(true);
    setZipProgress(10);
    try {
      onToast('info', 'Generating complete CaptionFlow AI Standalone Tool ZIP archive...');
      await downloadToolZip((pct, msg) => {
        setZipProgress(pct);
      });
      onToast('success', 'CaptionFlow AI Tool .ZIP downloaded successfully!');
    } catch (err: any) {
      onToast('error', `Failed to generate ZIP: ${err.message}`);
    } finally {
      setIsZipping(false);
      setZipProgress(0);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-5 text-xs text-[#CBD5E1] overflow-y-auto select-none">
      {/* 0. Standalone Tool ZIP Package Card */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#181E25] via-[#161B22] to-[#181E25] border border-[#F5B82E]/40 flex flex-col gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F5B82E]/15 border border-[#F5B82E]/30 flex items-center justify-center text-[#F5B82E]">
              <Archive className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-white text-xs block">Tool Source Package (.ZIP)</span>
              <span className="text-[10px] text-[#8D96A3]">Download 100% complete offline tool</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F5B82E]/20 text-[#F5B82E] border border-[#F5B82E]/40">
            OFFLINE READY
          </span>
        </div>

        <p className="text-[11px] text-[#94A3B8] leading-relaxed">
          Extract this ZIP on your computer, run <code className="text-[#F5B82E] font-mono">npm install</code> & <code className="text-[#F5B82E] font-mono">npm run dev</code> to use CaptionFlow AI completely locally with zero backend or API keys required.
        </p>

        {isZipping ? (
          <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#12161B] border border-[#252B33]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#CBD5E1] flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5B82E]" />
                Building ZIP archive...
              </span>
              <span className="font-mono text-[#F5B82E]">{zipProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#1F2630] rounded-full overflow-hidden">
              <div
                style={{ width: `${zipProgress}%` }}
                className="h-full bg-[#F5B82E] transition-all duration-150"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={handleDownloadZip}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#F5B82E] hover:bg-[#E5A81E] text-[#0B0D10] font-black text-xs shadow-md shadow-[#F5B82E]/20 transition-all cursor-pointer"
          >
            <Archive className="w-4 h-4" />
            <span>Download Tool (.ZIP File)</span>
          </button>
        )}
      </div>

      {/* 1. Subtitle & Text Exports */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-[#F5B82E]" />
          <span>Subtitle & Project Exports</span>
        </span>

        <div className="grid grid-cols-3 gap-2.5">
          {/* SRT button */}
          <button
            onClick={handleExportSRT}
            className="p-3 rounded-xl bg-[#161B22] hover:bg-[#1C232D] border border-[#252B33] hover:border-[#3B82F6]/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] mb-2 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-xs mb-0.5">SRT File</span>
            <span className="text-[10px] text-[#8D96A3]">SubRip Subtitles</span>
          </button>

          {/* VTT button */}
          <button
            onClick={handleExportVTT}
            className="p-3 rounded-xl bg-[#161B22] hover:bg-[#1C232D] border border-[#252B33] hover:border-[#10B981]/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 flex items-center justify-center text-[#10B981] mb-2 group-hover:scale-105 transition-transform">
              <FileCode className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-xs mb-0.5">VTT File</span>
            <span className="text-[10px] text-[#8D96A3]">WebVTT Subtitles</span>
          </button>

          {/* Project JSON button */}
          <button
            onClick={handleExportJSON}
            className="p-3 rounded-xl bg-[#161B22] hover:bg-[#1C232D] border border-[#252B33] hover:border-[#F5B82E]/50 flex flex-col items-center justify-center text-center transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#F5B82E]/10 flex items-center justify-center text-[#F5B82E] mb-2 group-hover:scale-105 transition-transform">
              <FileJson className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-xs mb-0.5">Project JSON</span>
            <span className="text-[10px] text-[#8D96A3]">Full project backup</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 2. Client-side Video Burn-in Renderer with 4K & 60FPS */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#F5B82E]" />
            <span>Burned-in Video Export (4K 60FPS)</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181E25] text-[#10B981] border border-[#10B981]/30 flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#F5B82E]" />
            <span>4K 60FPS Ready</span>
          </span>
        </div>

        {/* Resolution selector */}
        <div>
          <label className="text-[11px] text-[#8D96A3] block mb-1.5 font-medium">Export Resolution</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: '4k' as const, label: '4K Ultra HD', desc: '3840×2160 / 2160×3840', badge: 'Ultra Quality' },
              { id: '1440p' as const, label: '1440p 2K QHD', desc: '2560×1440 / 1440×2560' },
              { id: '1080p' as const, label: '1080p Full HD', desc: '1920×1080 / 1080×1920' },
              { id: '720p' as const, label: '720p HD', desc: '1280×720 / 720×1280' },
              { id: 'original' as const, label: 'Original Size', desc: 'Source Resolution' },
            ].map((res) => (
              <button
                key={res.id}
                onClick={() => setResolution(res.id)}
                className={`p-2.5 rounded-lg border text-left flex flex-col relative transition-all ${
                  resolution === res.id
                    ? 'bg-[#F5B82E]/15 border-[#F5B82E] text-white shadow-sm shadow-[#F5B82E]/10'
                    : 'bg-[#161B22] border-[#252B33] text-[#8D96A3] hover:text-white hover:border-[#384250]'
                }`}
              >
                {res.badge && (
                  <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1 rounded bg-[#F5B82E] text-[#0B0D10]">
                    {res.badge}
                  </span>
                )}
                <span className="font-bold text-xs flex items-center gap-1">
                  {resolution === res.id && <CheckCircle2 className="w-3 h-3 text-[#F5B82E]" />}
                  {res.label}
                </span>
                <span className="text-[10px] text-[#8D96A3] mt-0.5">{res.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Frame Rate (FPS) selector */}
        <div>
          <label className="text-[11px] text-[#8D96A3] block mb-1.5 font-medium">Frame Rate (FPS)</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFps(60)}
              className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                fps === 60
                  ? 'bg-[#F5B82E]/15 border-[#F5B82E] text-white'
                  : 'bg-[#161B22] border-[#252B33] text-[#8D96A3] hover:text-white'
              }`}
            >
              <div>
                <span className="font-bold text-xs block">60 FPS (Ultra Smooth)</span>
                <span className="text-[10px] text-[#8D96A3]">Perfect for Reels, TikTok & high-motion videos</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F5B82E]/20 text-[#F5B82E] font-bold">
                60 fps
              </span>
            </button>

            <button
              onClick={() => setFps(30)}
              className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                fps === 30
                  ? 'bg-[#F5B82E]/15 border-[#F5B82E] text-white'
                  : 'bg-[#161B22] border-[#252B33] text-[#8D96A3] hover:text-white'
              }`}
            >
              <div>
                <span className="font-bold text-xs block">30 FPS (Standard)</span>
                <span className="text-[10px] text-[#8D96A3]">Faster rendering, smaller file size</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#252B33] text-[#8D96A3] font-bold">
                30 fps
              </span>
            </button>
          </div>
        </div>

        {/* 4K 60FPS High-DPI Encoding Info */}
        <div className="p-3 rounded-lg bg-[#161B22] border border-[#252B33] flex items-start gap-2 text-[11px] text-[#8D96A3]">
          <AlertCircle className="w-4 h-4 text-[#F5B82E] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#CBD5E1]">Hardware Accelerated 4K 60FPS:</strong> Video frames and karaoke typography are drawn at high DPI onto a native 3840×2160 / 2160×3840 offscreen canvas with sub-frame word interpolation, recorded directly via browser MediaStreams at up to 36 Mbps.
          </p>
        </div>

        {/* Export Progress Bar */}
        {isExportingVideo ? (
          <div className="p-4 rounded-xl bg-[#161B22] border border-[#F5B82E]/40 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#F5B82E] animate-spin" />
                <span className="font-bold text-white text-xs">
                  {statusMsg || `Encoding ${resolution.toUpperCase()} @ ${fps}fps...`} ({exportProgress}%)
                </span>
              </div>
              <button
                onClick={handleCancelExport}
                className="flex items-center gap-1 text-[11px] text-[#EF4444] hover:underline cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-2 bg-[#1F2630] rounded-full overflow-hidden">
              <div
                style={{ width: `${exportProgress}%` }}
                className="h-full bg-gradient-to-r from-[#F5B82E] to-[#EAB308] transition-all duration-150"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={handleExportVideo}
            disabled={!videoRef.current || !videoRef.current.src}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#F5B82E] hover:bg-[#E5A81E] disabled:bg-[#252B33] disabled:text-[#64748B] text-[#0B0D10] font-black text-xs shadow-md shadow-[#F5B82E]/20 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Film className="w-4 h-4" />
            <span>Render & Export {resolution.toUpperCase()} @ {fps}FPS Video</span>
          </button>
        )}
      </div>
    </div>
  );
};
