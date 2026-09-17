export type TabType = 'create' | 'edit' | 'style' | 'animate' | 'brand' | 'export' | 'settings';

export type ExportResolution = 'original' | '4k' | '1440p' | '1080p' | '720p';

export type ExportFps = 30 | 60;

export type AnimationType =
  | 'fade'
  | 'pop'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'bounce'
  | 'typewriter'
  | 'word-stagger'
  | 'character-stagger'
  | 'scale-punch'
  | 'blur-reveal'
  | 'elastic'
  | 'rotate'
  | 'tracking-reveal'
  | 'karaoke';

export type StylePresetId =
  | 'viral'
  | 'karaoke'
  | 'minimal'
  | 'podcast'
  | 'news'
  | 'cinematic'
  | 'neon'
  | 'bold-social'
  | 'corporate'
  | 'luxury';

export type HighlightMode = 'color' | 'scale' | 'background' | 'underline' | 'glow';

export type CaptionPositionPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'custom';

export type SafeZonePreset = 'none' | '9:16' | '16:9' | '1:1' | '4:5';

export interface Word {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
  timingType?: 'exact' | 'estimated';
}

export interface CaptionStyle {
  id?: string;
  name?: string;
  fontFamily: string;
  fontSize: number; // in px at standard 1080p canvas baseline or percentage
  fontWeight: string | number;
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  backgroundColor: string; // e.g. rgba(0,0,0,0.6) or "transparent"
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number; // in px
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  positionPreset: CaptionPositionPreset;
  posX: number; // percentage 0 - 100
  posY: number; // percentage 0 - 100
  // Karaoke / Word Highlight Settings
  highlightColor: string;
  highlightNormalColor: string;
  highlightScale: number; // e.g. 1.08
  highlightBackground: string;
  highlightUnderline: boolean;
  highlightGlow: boolean;
  highlightMode: HighlightMode;
}

export interface Caption {
  id: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
  words: Word[];
  style: StylePresetId | string;
  animation: AnimationType;
  customStyle?: Partial<CaptionStyle>;
}

export interface VideoMetadata {
  name: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  size: number;
  type: string;
  url: string;
}

export interface BrandKit {
  name: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  fontWeight: string | number;
  backgroundColor: string;
  strokeColor: string;
}

export interface SegmentationSettings {
  maxWords: number;
  maxChars: number;
  minDuration: number;
  maxDuration: number;
  readingSpeed: number; // words per second
  mode: 'word' | 'char' | 'sentence' | 'manual';
}

export interface OverlapIssue {
  firstIndex: number;
  secondIndex: number;
  firstId: string;
  secondId: string;
  overlapDuration: number;
}

export interface CaptionStats {
  totalCaptions: number;
  totalWords: number;
  totalDuration?: number;
  avgDuration?: number;
  avgWordsPerCaption?: number;
  readingSpeed: number; // words / sec average
  longestCaptionWords?: number;
  longestCaptionText?: string;
}

export interface ProjectData {
  version: string;
  name: string;
  updatedAt: string;
  videoMetadata: Omit<VideoMetadata, 'url'> | null;
  captions: Caption[];
  brandKit: BrandKit;
  settings: {
    safeZone: SafeZonePreset;
    safeMarginX: number;
    safeMarginY: number;
    defaultStyle: StylePresetId;
    defaultAnimation: AnimationType;
    animationDuration: number;
    readingSpeedThreshold: number;
  };
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  text: string;
}
