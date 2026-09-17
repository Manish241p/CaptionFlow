import { Caption, SafeZonePreset, ExportResolution, ExportFps } from '../types';
import { CaptionRenderer } from './renderer';
import { TimingEngine } from './timing';

export interface VideoExportOptions {
  videoElement: HTMLVideoElement;
  captions: Caption[];
  safeZone: SafeZonePreset;
  safeMarginX: number;
  safeMarginY: number;
  resolution?: ExportResolution;
  fps?: ExportFps;
  onProgress?: (progress: number) => void;
  onStatus?: (statusText: string) => void;
  onComplete?: (blobUrl: string) => void;
  onError?: (err: Error) => void;
}

export class VideoExporter {
  private static isExporting = false;
  private static cancelRequested = false;

  static isSupported(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined';
  }

  static getSupportedMimeType(): string {
    if (!this.isSupported()) return '';
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4', // only if browser natively supports MediaRecorder MP4
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }

  static cancel(): void {
    this.cancelRequested = true;
  }

  static getIsExporting(): boolean {
    return this.isExporting;
  }

  /**
   * Calculate precise export dimensions matching the aspect ratio and target resolution
   */
  static getDimensionsForResolution(
    vWidth: number,
    vHeight: number,
    resolution: ExportResolution = '1080p'
  ): { width: number; height: number } {
    const safeVWidth = vWidth > 0 ? vWidth : 1920;
    const safeVHeight = vHeight > 0 ? vHeight : 1080;
    const aspect = safeVWidth / safeVHeight;

    if (resolution === 'original') {
      return {
        width: Math.round(safeVWidth / 2) * 2,
        height: Math.round(safeVHeight / 2) * 2,
      };
    }

    if (resolution === '4k') {
      if (aspect < 0.8) {
        // Vertical 9:16 4K (2160 x 3840)
        return { width: 2160, height: 3840 };
      }
      if (aspect >= 1.3) {
        // Horizontal 16:9 4K (3840 x 2160)
        return { width: 3840, height: 2160 };
      }
      if (Math.abs(aspect - 1) < 0.15) {
        // 1:1 Square 4K (2160 x 2160)
        return { width: 2160, height: 2160 };
      }
      if (Math.abs(aspect - 0.8) < 0.1) {
        // 4:5 Instagram 4K (2160 x 2700)
        return { width: 2160, height: 2700 };
      }
      // General aspect ratio clamped to 3840 on longest edge
      if (aspect > 1) {
        const h = Math.round((3840 / aspect) / 2) * 2;
        return { width: 3840, height: h };
      } else {
        const w = Math.round((3840 * aspect) / 2) * 2;
        return { width: w, height: 3840 };
      }
    }

    if (resolution === '1440p') {
      if (aspect < 0.8) {
        return { width: 1440, height: 2560 };
      }
      if (aspect >= 1.3) {
        return { width: 2560, height: 1440 };
      }
      return {
        width: aspect > 1 ? 2560 : Math.round((2560 * aspect) / 2) * 2,
        height: aspect > 1 ? Math.round((2560 / aspect) / 2) * 2 : 2560,
      };
    }

    if (resolution === '1080p') {
      if (aspect < 0.8) {
        return { width: 1080, height: 1920 };
      }
      if (aspect >= 1.3) {
        return { width: 1920, height: 1080 };
      }
      return {
        width: aspect > 1 ? 1920 : Math.round((1920 * aspect) / 2) * 2,
        height: aspect > 1 ? Math.round((1920 / aspect) / 2) * 2 : 1920,
      };
    }

    // 720p fallback
    if (aspect < 0.8) {
      return { width: 720, height: 1280 };
    }
    return { width: 1280, height: 720 };
  }

  /**
   * Determine optimal bitrate for requested resolution and framerate
   */
  static getBitrate(resolution: ExportResolution = '1080p', fps: ExportFps = 60): number {
    if (resolution === '4k') {
      return fps === 60 ? 36_000_000 : 25_000_000; // 36 Mbps / 25 Mbps
    }
    if (resolution === '1440p') {
      return fps === 60 ? 22_000_000 : 16_000_000;
    }
    if (resolution === '1080p') {
      return fps === 60 ? 15_000_000 : 8_500_000;
    }
    if (resolution === 'original') {
      return fps === 60 ? 20_000_000 : 12_000_000;
    }
    return fps === 60 ? 8_000_000 : 4_500_000;
  }

  /**
   * Render video + caption overlay into high-resolution Canvas and record via MediaRecorder
   * Supports 4K (3840x2160 / 2160x3840) and 60fps smooth capture
   */
  static async exportVideo(options: VideoExportOptions): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('MediaRecorder is not supported in this browser.');
    }

    const {
      videoElement,
      captions,
      safeZone,
      safeMarginX,
      safeMarginY,
      resolution = '1080p',
      fps = 60,
      onProgress,
      onStatus,
    } = options;

    if (!videoElement.duration || isNaN(videoElement.duration)) {
      throw new Error('Video duration is invalid or not loaded.');
    }

    this.isExporting = true;
    this.cancelRequested = false;

    // Calculate dimensions based on target resolution
    const vWidth = videoElement.videoWidth || 1920;
    const vHeight = videoElement.videoHeight || 1080;
    const { width, height } = this.getDimensionsForResolution(vWidth, vHeight, resolution);

    onStatus?.(`Configuring canvas for ${width}x${height} @ ${fps}fps...`);

    // Create offscreen rendering canvas matching target resolution (up to 4K 3840x2160)
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      this.isExporting = false;
      throw new Error('Failed to create canvas 2D rendering context.');
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Set up canvas stream at requested fps (30 or 60 fps)
    const canvasStream = canvas.captureStream(fps);

    // Capture audio track from video if available
    let combinedStream: MediaStream = canvasStream;
    try {
      let audioTracks: MediaStreamTrack[] = [];
      if (typeof (videoElement as any).captureStream === 'function') {
        const stream = (videoElement as any).captureStream();
        audioTracks = stream.getAudioTracks();
      } else if (typeof (videoElement as any).mozCaptureStream === 'function') {
        const stream = (videoElement as any).mozCaptureStream();
        audioTracks = stream.getAudioTracks();
      }

      if (audioTracks.length > 0) {
        combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      }
    } catch (e) {
      console.warn('Could not extract direct audio stream from video element', e);
    }

    const mimeType = this.getSupportedMimeType();
    const bitrate = this.getBitrate(resolution, fps);

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: bitrate,
      });
    } catch (e) {
      console.warn('Failed with high bitrate, falling back to default bitrate', e);
      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType || undefined,
      });
    }

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        this.isExporting = false;
        if (this.cancelRequested) {
          reject(new Error('Export was cancelled by user.'));
          return;
        }

        const finalBlob = new Blob(recordedChunks, { type: mimeType || 'video/webm' });
        const downloadUrl = URL.createObjectURL(finalBlob);

        // Trigger browser download
        const a = document.createElement('a');
        a.href = downloadUrl;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `captionflow_${resolution}_${fps}fps_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        onProgress?.(100);
        onStatus?.('Export complete! Downloading 4K/HD video...');
        resolve(downloadUrl);
      };

      mediaRecorder.onerror = (err: any) => {
        this.isExporting = false;
        reject(new Error(err.message || 'MediaRecorder failed during video export.'));
      };

      // Start recording with 200ms slice buffer
      mediaRecorder.start(200);
      onStatus?.(`Rendering ${resolution.toUpperCase()} @ ${fps}fps with burned-in captions...`);

      const originalTime = videoElement.currentTime;
      const originalMuted = videoElement.muted;

      videoElement.currentTime = 0;
      videoElement.muted = false;

      // Frame step playback loop
      const duration = videoElement.duration;

      const renderStep = () => {
        if (this.cancelRequested) {
          mediaRecorder.stop();
          videoElement.pause();
          videoElement.currentTime = originalTime;
          videoElement.muted = originalMuted;
          return;
        }

        const currentTime = videoElement.currentTime;
        const progress = Math.min(100, Math.floor((currentTime / duration) * 100));
        onProgress?.(progress);

        // Draw video frame scaled to canvas
        ctx.drawImage(videoElement, 0, 0, width, height);

        // Lookup active caption
        const activeCaption = TimingEngine.getActiveCaption(captions, currentTime);

        // Render caption overlay with full high-DPI scaling
        CaptionRenderer.renderFrame({
          canvas,
          ctx,
          currentTime,
          activeCaption,
          safeZone,
          safeMarginX,
          safeMarginY,
          showSafeZoneGuides: false,
        });

        if (videoElement.ended || currentTime >= duration - 0.04) {
          mediaRecorder.stop();
          videoElement.pause();
          videoElement.currentTime = originalTime;
          videoElement.muted = originalMuted;
          return;
        }

        requestAnimationFrame(renderStep);
      };

      // Play video to feed frames and audio to the recorder
      videoElement
        .play()
        .then(() => {
          requestAnimationFrame(renderStep);
        })
        .catch((err) => {
          this.isExporting = false;
          mediaRecorder.stop();
          reject(new Error(`Could not play video for export: ${err.message}`));
        });
    });
  }

  static downloadBlob(blob: Blob, filename = 'video.webm'): void {
    const url = URL.createObjectURL(blob);
    this.downloadBlobUrl(url, filename);
  }

  static downloadBlobUrl(url: string, filename = 'video.webm'): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
