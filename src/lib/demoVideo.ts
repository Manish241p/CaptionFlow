/**
 * Generates an offline 10-second sample video directly inside the browser using Canvas & Web Audio
 * so users can test video playback, captions, karaoke, and export without needing their own video file.
 */
export interface DemoVideoOptions {
  width?: number;
  height?: number;
  fps?: number;
  is4K?: boolean;
}

/**
 * Generates an offline sample video directly inside the browser using Canvas & Web Audio.
 * Supports standard HD as well as 4K 60FPS reel synthesis for instant testing.
 */
export async function createDemoVideoBlob(options?: DemoVideoOptions): Promise<{ blob: Blob; url: string; width: number; height: number; fps: number }> {
  return new Promise((resolve, reject) => {
    try {
      const is4K = options?.is4K || false;
      const width = options?.width || (is4K ? 3840 : 1280);
      const height = options?.height || (is4K ? 2160 : 720);
      const fps = options?.fps || (is4K ? 60 : 30);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      const totalSeconds = 10;
      const totalFrames = fps * totalSeconds;

      // Audio context to synthesize a rhythm beat
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      // Synthesize rhythmic beat sequence
      const now = audioCtx.currentTime;
      for (let s = 0; s < totalSeconds; s++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(dest);

        osc.type = s % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(s % 2 === 0 ? 440 : 554.37, now + s);

        gain.gain.setValueAtTime(0.3, now + s);
        gain.gain.exponentialRampToValueAtTime(0.001, now + s + 0.35);

        osc.start(now + s);
        osc.stop(now + s + 0.4);
      }

      const canvasStream = canvas.captureStream(fps);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : 'video/webm',
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        audioCtx.close();
        resolve({ blob, url, width, height, fps });
      };

      recorder.start();

      let frame = 0;
      const interval = setInterval(() => {
        const sec = (frame / fps).toFixed(1);
        const progress = frame / totalFrames;

        // Gradient dynamic background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        const hue1 = (frame * 1.5) % 360;
        const hue2 = (hue1 + 60) % 360;
        grad.addColorStop(0, `hsl(${hue1}, 45%, 12%)`);
        grad.addColorStop(1, `hsl(${hue2}, 50%, 8%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Animated visual waveform / circles
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 184, 46, 0.4)';
        ctx.lineWidth = 3;
        const circleRadius = 120 + Math.sin(frame * 0.1) * 25;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 - 30, circleRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 - 30, circleRadius + 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Badge & Title
        ctx.fillStyle = '#F5B82E';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CAPTIONFLOW AI • SAMPLE CREATOR REEL', width / 2, height / 2 - 90);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 48px system-ui, sans-serif';
        ctx.fillText('WELCOME TO CAPTIONFLOW AI', width / 2, height / 2 - 30);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 24px system-ui, sans-serif';
        ctx.fillText('Live In-Browser Speech Recognition & Caption Studio', width / 2, height / 2 + 25);

        // Progress bar
        const barW = 600;
        const barH = 10;
        const barX = (width - barW) / 2;
        const barY = height - 120;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barX, barY, barW, barH);

        ctx.fillStyle = '#F5B82E';
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '16px monospace';
        ctx.fillText(`00:0${Math.floor(frame / fps)}.000 / 00:10.000`, width / 2, barY + 35);

        frame++;
        if (frame >= totalFrames) {
          clearInterval(interval);
          recorder.stop();
        }
      }, 1000 / fps);
    } catch (e) {
      reject(e);
    }
  });
}

export const DEMO_SAMPLE_CAPTIONS = [
  {
    id: 'demo-1',
    start: 0.0,
    end: 3.2,
    text: 'Welcome to CaptionFlow AI!',
    words: [
      { text: 'Welcome', start: 0.0, end: 0.8, timingType: 'estimated' as const },
      { text: 'to', start: 0.8, end: 1.2, timingType: 'estimated' as const },
      { text: 'CaptionFlow', start: 1.2, end: 2.2, timingType: 'estimated' as const },
      { text: 'AI!', start: 2.2, end: 3.2, timingType: 'estimated' as const },
    ],
    style: 'viral',
    animation: 'pop' as const,
  },
  {
    id: 'demo-2',
    start: 3.4,
    end: 6.5,
    text: 'Karaoke word highlighting with zero latency',
    words: [
      { text: 'Karaoke', start: 3.4, end: 4.1, timingType: 'estimated' as const },
      { text: 'word', start: 4.1, end: 4.6, timingType: 'estimated' as const },
      { text: 'highlighting', start: 4.6, end: 5.3, timingType: 'estimated' as const },
      { text: 'with', start: 5.3, end: 5.7, timingType: 'estimated' as const },
      { text: 'zero', start: 5.7, end: 6.1, timingType: 'estimated' as const },
      { text: 'latency', start: 6.1, end: 6.5, timingType: 'estimated' as const },
    ],
    style: 'karaoke',
    animation: 'karaoke' as const,
  },
  {
    id: 'demo-3',
    start: 6.8,
    end: 9.8,
    text: 'Everything runs 100% locally in your browser!',
    words: [
      { text: 'Everything', start: 6.8, end: 7.4, timingType: 'estimated' as const },
      { text: 'runs', start: 7.4, end: 7.9, timingType: 'estimated' as const },
      { text: '100%', start: 7.9, end: 8.4, timingType: 'estimated' as const },
      { text: 'locally', start: 8.4, end: 8.9, timingType: 'estimated' as const },
      { text: 'in', start: 8.9, end: 9.2, timingType: 'estimated' as const },
      { text: 'your', start: 9.2, end: 9.4, timingType: 'estimated' as const },
      { text: 'browser!', start: 9.4, end: 9.8, timingType: 'estimated' as const },
    ],
    style: 'bold-social',
    animation: 'bounce' as const,
  },
];
