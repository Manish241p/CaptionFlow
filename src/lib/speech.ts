import { Caption } from '../types';
import { SRTParser } from './srt';

export interface SpeechLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: SpeechLanguage[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
];

export const SPEECH_LANGUAGES = SUPPORTED_LANGUAGES;

export interface TranscriptionOptions {
  language: string;
  defaultStyle?: string;
  defaultAnimation?: string;
  onSegmentReceived?: (caption: Caption) => void;
  onError?: (errorMsg: string) => void;
  onStatusChange?: (status: 'idle' | 'listening' | 'stopped' | 'error') => void;
}

/**
 * Pluggable Local Transcription Adapter Interface (Mode E)
 */
export interface LocalTranscriptionAdapter {
  isAvailable(): boolean;
  transcribeVideo(videoBlob: Blob, options: TranscriptionOptions): Promise<Caption[]>;
}

export interface SpeechRecognitionConstructorOptions {
  language?: string;
  onResult?: (chunk: { text: string; start: number; end: number; words: any[] }) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

export class BrowserSpeechRecognitionManager {
  private recognition: any = null;
  private isListening = false;
  private currentSegmentStart = 0;
  private videoElement: HTMLVideoElement | null = null;
  private options: TranscriptionOptions | null = null;
  private constructorOptions?: SpeechRecognitionConstructorOptions;
  private generatedCaptions: Caption[] = [];
  private sessionStartTime = 0;

  constructor(options?: SpeechRecognitionConstructorOptions) {
    this.constructorOptions = options;
  }

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  static getRecognitionClass(): any {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  start(): boolean {
    const RecognitionClass = BrowserSpeechRecognitionManager.getRecognitionClass();
    if (!RecognitionClass) return false;

    try {
      this.recognition = new RecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.constructorOptions?.language || 'en-US';
      this.sessionStartTime = Date.now();
      this.currentSegmentStart = 0;

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event: any) => {
        const elapsedSec = (Date.now() - this.sessionStartTime) / 1000;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript?.trim();
          if (!transcript) continue;

          if (res.isFinal) {
            const segmentStart = Number(Math.max(0, this.currentSegmentStart).toFixed(2));
            const segmentEnd = Number(Math.max(segmentStart + 0.8, elapsedSec).toFixed(2));
            const words = SRTParser.estimateWords(transcript, segmentStart, segmentEnd);

            this.constructorOptions?.onResult?.({
              text: transcript,
              start: segmentStart,
              end: segmentEnd,
              words,
            });
            this.currentSegmentStart = elapsedSec;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        this.constructorOptions?.onError?.(event.error || 'Speech error');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.constructorOptions?.onEnd?.();
      };

      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e: any) {
      this.constructorOptions?.onError?.(e.message);
      return false;
    }
  }

  stop(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
  }

  startSession(
    video: HTMLVideoElement,
    options: TranscriptionOptions
  ): { success: boolean; message: string } {
    const RecognitionClass = BrowserSpeechRecognitionManager.getRecognitionClass();
    if (!RecognitionClass) {
      return {
        success: false,
        message: 'Your browser does not support Speech Recognition. Try Google Chrome or Microsoft Edge.',
      };
    }

    try {
      this.recognition = new RecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = options.language || 'en-US';
      this.videoElement = video;
      this.options = options;
      this.generatedCaptions = [];
      this.currentSegmentStart = video.currentTime;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.currentSegmentStart = this.videoElement ? this.videoElement.currentTime : 0;
        options.onStatusChange?.('listening');
      };

      this.recognition.onresult = (event: any) => {
        const currentTime = this.videoElement ? this.videoElement.currentTime : 0;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript?.trim();
          if (!transcript) continue;

          if (res.isFinal) {
            const segmentStart = Number(Math.max(0, this.currentSegmentStart).toFixed(2));
            const segmentEnd = Number(Math.max(segmentStart + 0.8, currentTime).toFixed(2));
            const words = SRTParser.estimateWords(transcript, segmentStart, segmentEnd);

            const caption: Caption = {
              id: `caption-${Date.now()}-${this.generatedCaptions.length + 1}`,
              start: segmentStart,
              end: segmentEnd,
              text: transcript,
              words,
              style: options.defaultStyle || 'viral',
              animation: (options.defaultAnimation as any) || 'pop',
            };

            this.generatedCaptions.push(caption);
            options.onSegmentReceived?.(caption);
            // Next segment starts at current time
            this.currentSegmentStart = currentTime;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        options.onError?.(`Speech recognition notice: ${event.error || 'unknown'}`);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onStatusChange?.('stopped');
      };

      this.recognition.start();
      return { success: true, message: 'Speech recognition started. Play video or speak to transcribe.' };
    } catch (err: any) {
      return { success: false, message: `Failed to initialize speech recognition: ${err.message}` };
    }
  }

  stopSession(): Caption[] {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.isListening = false;
    this.options?.onStatusChange?.('stopped');
    return this.generatedCaptions;
  }

  isActive(): boolean {
    return this.isListening;
  }
}

/**
 * Mode E Pluggable adapter implementation stub.
 * Satisfies the requirement that a local speech-to-text engine can be plugged in later
 * without the core editor depending on it or downloading any models automatically.
 */
export const defaultLocalTranscriptionAdapter: LocalTranscriptionAdapter = {
  isAvailable() {
    return false; // Local offline model not bundled by default to follow strict no-network rule
  },
  async transcribeVideo(_videoBlob: Blob, _options: TranscriptionOptions): Promise<Caption[]> {
    throw new Error('Local STT model adapter is not active. Using browser speech recognition or subtitle import.');
  },
};
