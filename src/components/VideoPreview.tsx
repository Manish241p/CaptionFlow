import React, { useEffect, useRef, useState } from 'react';
import { Caption, SafeZonePreset, VideoMetadata } from '../types';
import { CaptionRenderer } from '../lib/renderer';
import { TimingEngine } from '../lib/timing';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Eye,
  EyeOff,
  Video as VideoIcon,
  Sparkles,
  Upload,
  Zap,
} from 'lucide-react';

interface VideoPreviewProps {
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoMetadata?: VideoMetadata | null;
  captions: Caption[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  safeZone: SafeZonePreset;
  safeMarginX: number;
  safeMarginY: number;
  onTimeUpdate: (time: number) => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onLoadSample: () => void;
  onUploadClick: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoUrl,
  videoRef,
  videoMetadata,
  captions,
  currentTime,
  duration,
  isPlaying,
  safeZone,
  safeMarginX,
  safeMarginY,
  onTimeUpdate,
  onPlayPause,
  onSeek,
  onLoadSample,
  onUploadClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSafeGuides, setShowSafeGuides] = useState<boolean>(true);

  // Sync canvas dimensions with video natural dimensions and render loop
  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas) {
        // Match canvas resolution to video's actual dimensions
        const vWidth = video.videoWidth || 1280;
        const vHeight = video.videoHeight || 720;

        if (canvas.width !== vWidth || canvas.height !== vHeight) {
          canvas.width = vWidth;
          canvas.height = vHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const time = video.currentTime;
          const activeCaption = TimingEngine.getActiveCaption(captions, time);

          CaptionRenderer.renderFrame({
            canvas,
            ctx,
            currentTime: time,
            activeCaption,
            safeZone,
            safeMarginX,
            safeMarginY,
            showSafeZoneGuides: showSafeGuides,
          });
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [captions, safeZone, safeMarginX, safeMarginY, showSafeGuides, videoRef]);

  // Handle video element timeupdate event
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const speed = parseFloat(e.target.value);
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const stepFrame = (deltaSeconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + deltaSeconds));
      onSeek(newTime);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-[#0B0D10] relative overflow-hidden select-none"
    >
      {/* Video Viewport Stage */}
      <div className="flex-1 relative flex items-center justify-center p-3 overflow-hidden">
        {videoUrl ? (
          <div className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-lg overflow-hidden bg-black">
            {/* 4K 60FPS indicator badge */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0D10]/85 backdrop-blur border border-[#252B33] text-[10px] font-mono text-[#CBD5E1] pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[#F5B82E] font-bold">
                {videoMetadata && (videoMetadata.width >= 3840 || videoMetadata.height >= 3840)
                  ? '4K UHD'
                  : videoMetadata
                  ? `${videoMetadata.width}×${videoMetadata.height}`
                  : '60FPS'}
              </span>
              <span className="text-[#8D96A3]">|</span>
              <span className="text-[#10B981]">60 FPS</span>
            </div>

            <video
              ref={videoRef as any}
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => onPlayPause()}
              playsInline
              className="max-w-full max-h-[calc(100vh-320px)] object-contain pointer-events-auto cursor-pointer"
              onClick={onPlayPause}
            />
            {/* Real-time High-resolution Caption Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none object-contain"
            />
          </div>
        ) : (
          /* Empty State prompt */
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md rounded-2xl bg-[#12161B] border border-[#252B33] shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#181E25] border border-[#252B33] flex items-center justify-center text-[#F5B82E] mb-4">
              <VideoIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Video Loaded</h3>
            <p className="text-xs text-[#8D96A3] mb-6 leading-relaxed">
              Upload an MP4, WebM, or MOV video, or load our instant demo reel to start editing and styling captions.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
              <button
                onClick={onUploadClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F5B82E] hover:bg-[#E5A81E] text-xs font-bold text-[#0B0D10] transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Video</span>
              </button>
              <button
                onClick={onLoadSample}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#181E25] hover:bg-[#252B33] text-xs font-semibold text-[#CBD5E1] border border-[#252B33] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#F5B82E]" />
                <span>Load Demo Reel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playback Control Bar */}
      <div className="h-14 bg-[#12161B] border-t border-[#252B33] px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Play/Pause, Step frame, Time indicator */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onPlayPause}
            disabled={!videoUrl}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              videoUrl
                ? 'bg-[#F5B82E] hover:bg-[#E5A81E] text-[#0B0D10] shadow-sm shadow-[#F5B82E]/20 cursor-pointer'
                : 'bg-[#181E25] text-[#4A5568] cursor-not-allowed'
            }`}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Frame Step Buttons */}
          <div className="hidden sm:flex items-center rounded-lg bg-[#181E25] border border-[#252B33] p-0.5">
            <button
              onClick={() => stepFrame(-0.1)}
              disabled={!videoUrl}
              className="p-1.5 text-[#CBD5E1] hover:text-white rounded hover:bg-[#252B33] disabled:text-[#4A5568] transition-colors"
              title="Step -1 frame (Left Arrow)"
              aria-label="Step frame backward"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => stepFrame(0.1)}
              disabled={!videoUrl}
              className="p-1.5 text-[#CBD5E1] hover:text-white rounded hover:bg-[#252B33] disabled:text-[#4A5568] transition-colors"
              title="Step +1 frame (Right Arrow)"
              aria-label="Step frame forward"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Precise Time Display */}
          <div className="text-xs font-mono text-[#CBD5E1] bg-[#181E25] px-2.5 py-1.5 rounded-md border border-[#252B33]">
            <span className="text-[#F5B82E] font-bold">{TimingEngine.formatTime(currentTime)}</span>
            <span className="text-[#8D96A3] mx-1">/</span>
            <span>{TimingEngine.formatTime(duration)}</span>
          </div>
        </div>

        {/* Center: Playhead Seek Scrub Slider */}
        <div className="flex-1 max-w-xl mx-2 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 10}
            step={0.05}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            disabled={!videoUrl}
            className="w-full h-1.5 bg-[#252B33] rounded-lg appearance-none cursor-pointer accent-[#F5B82E] disabled:cursor-not-allowed"
            aria-label="Video playback seeker"
          />
        </div>

        {/* Right: Audio Volume, Safe Zone toggle, Playback Speed, Fullscreen */}
        <div className="flex items-center gap-2.5">
          {/* Safe Zone toggle */}
          {safeZone !== 'none' && (
            <button
              onClick={() => setShowSafeGuides(!showSafeGuides)}
              className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors ${
                showSafeGuides
                  ? 'bg-[#F5B82E]/10 border-[#F5B82E]/40 text-[#F5B82E]'
                  : 'bg-[#181E25] border-[#252B33] text-[#8D96A3]'
              }`}
              title="Toggle Safe Zone Guides"
            >
              {showSafeGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{safeZone}</span>
            </button>
          )}

          {/* Playback speed */}
          <select
            value={playbackRate}
            onChange={handleSpeedChange}
            disabled={!videoUrl}
            className="bg-[#181E25] border border-[#252B33] text-[#CBD5E1] text-xs rounded-md px-2 py-1 outline-none cursor-pointer"
            title="Playback Speed"
            aria-label="Playback Speed"
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1.0x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>

          {/* Volume Control */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#181E25] px-2 py-1 rounded-md border border-[#252B33]">
            <button
              onClick={toggleMute}
              className="text-[#CBD5E1] hover:text-white p-0.5"
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label="Toggle mute"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-[#EF4444]" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-14 h-1 bg-[#252B33] rounded-lg appearance-none cursor-pointer accent-[#F5B82E]"
              aria-label="Volume level"
            />
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md bg-[#181E25] hover:bg-[#252B33] border border-[#252B33] text-[#CBD5E1] hover:text-white transition-colors"
            title="Toggle Fullscreen"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
