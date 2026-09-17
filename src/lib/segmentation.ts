import { Caption, CaptionStats, OverlapIssue, SegmentationSettings, Word } from '../types';
import { SRTParser } from './srt';

export class CaptionSegmentation {
  /**
   * Segment raw transcript text into timed captions
   */
  static segmentTranscript(
    rawText: string,
    totalDuration: number,
    settings: SegmentationSettings,
    defaultStyle = 'viral',
    defaultAnimation = 'pop'
  ): Caption[] {
    if (!rawText || !rawText.trim()) return [];

    const cleaned = rawText.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];

    let chunks: string[] = [];

    switch (settings.mode) {
      case 'sentence': {
        // Split by punctuation: . ? ! । (Hindi danda)
        const sentences = cleaned.split(/(?<=[.?!।])\s+/);
        for (const sentence of sentences) {
          const s = sentence.trim();
          if (!s) continue;
          if (s.split(/\s+/).length > settings.maxWords || s.length > settings.maxChars) {
            chunks.push(...this.chunkByWords(s, settings.maxWords, settings.maxChars));
          } else {
            chunks.push(s);
          }
        }
        break;
      }
      case 'char': {
        chunks = this.chunkByChars(cleaned, settings.maxChars);
        break;
      }
      case 'word':
      default: {
        chunks = this.chunkByWords(cleaned, settings.maxWords, settings.maxChars);
        break;
      }
    }

    if (chunks.length === 0) return [];

    // Calculate time allocations
    const captions: Caption[] = [];
    const totalWords = chunks.reduce((acc, c) => acc + c.split(/\s+/).length, 0);

    let currentTime = 0;
    const baseDuration = Math.max(totalDuration, chunks.length * settings.minDuration);

    chunks.forEach((chunk, index) => {
      const wordsInChunk = chunk.split(/\s+/).filter(Boolean).length;
      // Proportional timing based on word count & reading speed
      let duration = (wordsInChunk / Math.max(1, totalWords)) * baseDuration;
      duration = Math.max(settings.minDuration, Math.min(settings.maxDuration, duration));

      const start = Number(currentTime.toFixed(2));
      const end = Number((currentTime + duration).toFixed(2));
      currentTime = end + 0.05; // 50ms breather gap

      const words = SRTParser.estimateWords(chunk, start, end);

      captions.push({
        id: `caption-${Date.now()}-${index + 1}`,
        start,
        end,
        text: chunk,
        words,
        style: defaultStyle,
        animation: defaultAnimation as any,
      });
    });

    return captions;
  }

  private static chunkByWords(text: string, maxWords: number, maxChars: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const result: string[] = [];
    let currentWords: string[] = [];
    let currentLength = 0;

    for (const w of words) {
      const addedLen = currentWords.length > 0 ? w.length + 1 : w.length;
      if (currentWords.length >= maxWords || (currentWords.length > 0 && currentLength + addedLen > maxChars)) {
        result.push(currentWords.join(' '));
        currentWords = [w];
        currentLength = w.length;
      } else {
        currentWords.push(w);
        currentLength += addedLen;
      }
    }

    if (currentWords.length > 0) {
      result.push(currentWords.join(' '));
    }

    return result;
  }

  private static chunkByChars(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const result: string[] = [];
    let current = '';

    for (const w of words) {
      if (!current) {
        current = w;
      } else if (current.length + 1 + w.length <= maxChars) {
        current += ' ' + w;
      } else {
        result.push(current);
        current = w;
      }
    }

    if (current) {
      result.push(current);
    }

    return result;
  }

  // --- CAPTION QUALITY TOOLS ---

  /**
   * Remove redundant consecutive spaces and trim
   */
  static removeDoubleSpaces(captions: Caption[]): Caption[] {
    return captions.map((c) => {
      const cleanedText = c.text.replace(/[ \t]+/g, ' ').trim();
      const words = SRTParser.estimateWords(cleanedText, c.start, c.end);
      return {
        ...c,
        text: cleanedText,
        words,
      };
    });
  }

  /**
   * Fix missing or trailing punctuation, capitalize first letter
   */
  static fixPunctuation(captions: Caption[]): Caption[] {
    return captions.map((c) => {
      let t = c.text.trim();
      if (!t) return c;
      // Capitalize first character
      t = t.charAt(0).toUpperCase() + t.slice(1);
      // Ensure clean punctuation spacing
      t = t.replace(/\s+([.,!?;:])/g, '$1');
      return {
        ...c,
        text: t,
        words: SRTParser.estimateWords(t, c.start, c.end),
      };
    });
  }

  /**
   * Auto-break lines into clean balanced lines if long
   */
  static autoBreakLines(captions: Caption[], maxLineChars = 24): Caption[] {
    return captions.map((c) => {
      const words = c.text.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
      if (words.length <= 3 || c.text.length <= maxLineChars) {
        return c;
      }

      // Split into 2 balanced lines
      const mid = Math.ceil(words.length / 2);
      const line1 = words.slice(0, mid).join(' ');
      const line2 = words.slice(mid).join(' ');
      const newText = `${line1}\n${line2}`;

      return {
        ...c,
        text: newText,
        words: SRTParser.estimateWords(newText, c.start, c.end),
      };
    });
  }

  /**
   * Normalize captions: re-estimate word timings and clean up whitespaces
   */
  static normalizeCaptions(captions: Caption[]): Caption[] {
    return captions.map((c) => {
      const text = c.text.replace(/\r\n/g, '\n').trim();
      return {
        ...c,
        text,
        words: SRTParser.estimateWords(text, c.start, c.end),
      };
    });
  }

  /**
   * Detect overlapping captions
   */
  static detectOverlaps(captions: Caption[]): OverlapIssue[] {
    const issues: OverlapIssue[] = [];
    const sorted = [...captions].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];

      if (curr.end > next.start) {
        const overlap = Number((curr.end - next.start).toFixed(3));
        issues.push({
          firstIndex: i,
          secondIndex: i + 1,
          firstId: curr.id,
          secondId: next.id,
          overlapDuration: overlap,
        });
      }
    }

    return issues;
  }

  /**
   * Fix overlaps non-destructively by snapping end time to next start time minus 0.05s
   */
  static fixOverlaps(captions: Caption[]): Caption[] {
    const sorted = [...captions].sort((a, b) => a.start - b.start);
    const result: Caption[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const curr = { ...sorted[i] };
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (curr.end > next.start) {
          curr.end = Math.max(curr.start + 0.1, Number((next.start - 0.05).toFixed(3)));
          curr.words = SRTParser.estimateWords(curr.text, curr.start, curr.end);
        }
      }
      result.push(curr);
    }

    return result;
  }

  /**
   * Calculate full statistics for all captions
   */
  static calculateStats(captions: Caption[]): CaptionStats {
    if (captions.length === 0) {
      return {
        totalCaptions: 0,
        totalWords: 0,
        avgDuration: 0,
        avgWordsPerCaption: 0,
        readingSpeed: 0,
        longestCaptionWords: 0,
        longestCaptionText: '',
      };
    }

    let totalWords = 0;
    let totalDuration = 0;
    let longestWords = 0;
    let longestText = '';

    captions.forEach((c) => {
      const words = c.text.split(/\s+/).filter(Boolean);
      totalWords += words.length;
      totalDuration += Math.max(0.1, c.end - c.start);

      if (words.length > longestWords) {
        longestWords = words.length;
        longestText = c.text;
      }
    });

    const avgDuration = totalDuration / captions.length;
    const avgWordsPerCaption = totalWords / captions.length;
    const readingSpeed = totalDuration > 0 ? totalWords / totalDuration : 0;

    return {
      totalCaptions: captions.length,
      totalWords,
      avgDuration: Number(avgDuration.toFixed(2)),
      avgWordsPerCaption: Number(avgWordsPerCaption.toFixed(1)),
      readingSpeed: Number(readingSpeed.toFixed(1)),
      longestCaptionWords: longestWords,
      longestCaptionText: longestText,
    };
  }
}
