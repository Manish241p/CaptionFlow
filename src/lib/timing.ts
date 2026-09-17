import { Caption, Word } from '../types';

export class TimingEngine {
  /**
   * Format seconds to mm:ss.mmm (or hh:mm:ss.mmm if > 1 hour)
   */
  static formatTime(seconds: number, includeHours = false): string {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const pad3 = (n: number) => n.toString().padStart(3, '0');

    if (includeHours || hrs > 0) {
      return `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}.${pad3(ms)}`;
    }
    return `${pad2(mins)}:${pad2(secs)}.${pad3(ms)}`;
  }

  /**
   * Format seconds to standard mm:ss for timeline ruler
   */
  static formatRulerTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const pad2 = (n: number) => n.toString().padStart(2, '0');
    return `${pad2(mins)}:${pad2(secs)}`;
  }

  /**
   * Parse timestamp string to seconds
   */
  static parseTimeString(str: string): number {
    if (!str) return 0;
    const parts = str.trim().split(':');
    if (parts.length === 3) {
      const hrs = parseFloat(parts[0]) || 0;
      const mins = parseFloat(parts[1]) || 0;
      const secs = parseFloat(parts[2].replace(',', '.')) || 0;
      return hrs * 3600 + mins * 60 + secs;
    }
    if (parts.length === 2) {
      const mins = parseFloat(parts[0]) || 0;
      const secs = parseFloat(parts[1].replace(',', '.')) || 0;
      return mins * 60 + secs;
    }
    return parseFloat(str.replace(',', '.')) || 0;
  }

  /**
   * Binary search / fast lookup for active caption at currentTime
   */
  static getActiveCaption(captions: Caption[], currentTime: number): Caption | null {
    if (!captions || captions.length === 0) return null;

    // Fast check for single/few captions
    if (captions.length <= 16) {
      for (let i = 0; i < captions.length; i++) {
        const c = captions[i];
        if (currentTime >= c.start && currentTime <= c.end) {
          return c;
        }
      }
      return null;
    }

    // Binary search approach for larger arrays
    let low = 0;
    let high = captions.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cap = captions[mid];

      if (currentTime >= cap.start && currentTime <= cap.end) {
        return cap;
      }
      if (currentTime < cap.start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return null;
  }

  /**
   * Return index of active word or -1
   */
  static getActiveWordIndex(words: Word[], currentTime: number): number {
    if (!words || words.length === 0) return -1;
    for (let i = 0; i < words.length; i++) {
      if (currentTime >= words[i].start && currentTime <= words[i].end) {
        return i;
      }
    }
    // If between words or past last word, check if still within range
    if (currentTime > words[words.length - 1].end) {
      return words.length - 1;
    }
    return -1;
  }

  /**
   * Calculate animation progress from 0 to 1
   */
  static getAnimationProgress(caption: Caption, currentTime: number, durationLimit = 0.5): number {
    const elapsed = currentTime - caption.start;
    if (elapsed <= 0) return 0;
    const progress = Math.min(1, elapsed / durationLimit);
    return progress;
  }

  /**
   * Clamp a time value
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Estimate word-level timestamps sequentially across caption duration
   */
  static estimateWordTimings(text: string, start: number, end: number): Word[] {
    const rawWords = text.trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    const duration = Math.max(0.1, end - start);
    const wordDuration = duration / rawWords.length;

    return rawWords.map((word, idx) => ({
      text: word,
      start: Number((start + idx * wordDuration).toFixed(3)),
      end: Number((start + (idx + 1) * wordDuration).toFixed(3)),
      timingType: 'estimated',
    }));
  }

  /**
   * Calculate average reading speed in words per second
   */
  static calculateReadingSpeed(captions: Caption[]): number {
    if (!captions || captions.length === 0) return 0;
    let totalWords = 0;
    let totalDuration = 0;

    for (const cap of captions) {
      const dur = Math.max(0.1, cap.end - cap.start);
      const words = cap.words?.length || cap.text.trim().split(/\s+/).filter(Boolean).length;
      totalWords += words;
      totalDuration += dur;
    }

    if (totalDuration === 0) return 0;
    return Number((totalWords / totalDuration).toFixed(1));
  }
}
