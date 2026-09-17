import { Caption, Word } from '../types';

export class SRTParser {
  /**
   * Parse SRT format text into Caption[]
   */
  static parse(srtContent: string, defaultStyle = 'viral', defaultAnimation = 'pop'): Caption[] {
    if (!srtContent || typeof srtContent !== 'string') {
      return [];
    }

    // Clean up UTF-8 BOM if present
    const cleaned = srtContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = cleaned.split(/\n\s*\n/);
    const captions: Caption[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i].trim();
      if (!block) continue;

      const lines = block.split('\n');
      if (lines.length < 2) continue;

      let timeLineIndex = 0;
      // First line might be an index number or directly the timecode
      if (/^\d+$/.test(lines[0].trim())) {
        timeLineIndex = 1;
      }

      if (timeLineIndex >= lines.length) continue;

      const timeLine = lines[timeLineIndex];
      const match = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
      if (!match) continue;

      const start = this.timeToSeconds(match[1], match[2], match[3], match[4]);
      const end = this.timeToSeconds(match[5], match[6], match[7], match[8]);

      // All remaining lines are caption text
      const textLines = lines.slice(timeLineIndex + 1).map((l) => l.trim()).filter(Boolean);
      const text = textLines.join('\n');

      if (!text) continue;

      const words = this.estimateWords(text, start, end);

      captions.push({
        id: `caption-${Date.now()}-${i + 1}`,
        start: Math.max(0, start),
        end: Math.max(start + 0.1, end),
        text,
        words,
        style: defaultStyle,
        animation: defaultAnimation as any,
      });
    }

    return captions.sort((a, b) => a.start - b.start);
  }

  private static timeToSeconds(hours: string, minutes: string, seconds: string, ms: string): number {
    return parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(ms, 10) / 1000;
  }

  static estimateWords(text: string, start: number, end: number): Word[] {
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

  static stringify(captions: Caption[]): string {
    return SRTExporter.export(captions);
  }

  static downloadSRT(content: string, filename = 'captions.srt'): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export class SRTExporter {
  /**
   * Export captions to standard SRT string format
   */
  static export(captions: Caption[]): string {
    const sorted = [...captions].sort((a, b) => a.start - b.start);
    return sorted
      .map((cap, idx) => {
        const indexStr = (idx + 1).toString();
        const startStr = this.secondsToSRTTime(cap.start);
        const endStr = this.secondsToSRTTime(cap.end);
        return `${indexStr}\n${startStr} --> ${endStr}\n${cap.text}\n`;
      })
      .join('\n');
  }

  static secondsToSRTTime(totalSeconds: number): string {
    const sec = Math.max(0, totalSeconds);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const pad3 = (n: number) => n.toString().padStart(3, '0');

    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)},${pad3(ms)}`;
  }
}
