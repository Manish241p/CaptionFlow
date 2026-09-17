import { Caption, Word } from '../types';
import { SRTParser } from './srt';

export class VTTParser {
  /**
   * Parse WebVTT format text into Caption[]
   */
  static parse(vttContent: string, defaultStyle = 'viral', defaultAnimation = 'pop'): Caption[] {
    if (!vttContent || typeof vttContent !== 'string') {
      return [];
    }

    const cleaned = vttContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n');
    const captions: Caption[] = [];

    let i = 0;
    // Skip WEBVTT header and any comments
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
    }

    while (i < lines.length) {
      let line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }

      // Check if this line is an identifier before the arrow
      let timeLine = line;
      if (!timeLine.includes('-->') && i + 1 < lines.length && lines[i + 1].includes('-->')) {
        i++;
        timeLine = lines[i].trim();
      }

      if (!timeLine.includes('-->')) {
        i++;
        continue;
      }

      const match = timeLine.match(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/);
      if (!match) {
        i++;
        continue;
      }

      const start = this.parseVTTTimestamp(match[1]);
      const end = this.parseVTTTimestamp(match[2]);

      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '') {
        // Strip out any HTML tags like <v Voice>, <c.color>, etc.
        const cleanText = lines[i].replace(/<\/?[^>]+(>|$)/g, '').trim();
        if (cleanText) {
          textLines.push(cleanText);
        }
        i++;
      }

      const text = textLines.join('\n');
      if (text) {
        const words = SRTParser.estimateWords(text, start, end);
        captions.push({
          id: `caption-${Date.now()}-${captions.length + 1}`,
          start: Math.max(0, start),
          end: Math.max(start + 0.1, end),
          text,
          words,
          style: defaultStyle,
          animation: defaultAnimation as any,
        });
      }
    }

    return captions.sort((a, b) => a.start - b.start);
  }

  private static parseVTTTimestamp(timeStr: string): number {
    const parts = timeStr.trim().split(':');
    let hours = 0;
    let minutes = 0;
    let secondsWithMs = '';

    if (parts.length === 3) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
      secondsWithMs = parts[2];
    } else if (parts.length === 2) {
      minutes = parseInt(parts[0], 10);
      secondsWithMs = parts[1];
    } else {
      return 0;
    }

    const secParts = secondsWithMs.split('.');
    const seconds = parseInt(secParts[0], 10) || 0;
    const ms = parseInt(secParts[1], 10) || 0;

    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  }

  static stringify(captions: Caption[]): string {
    return VTTExporter.export(captions);
  }

  static downloadVTT(content: string, filename = 'captions.vtt'): void {
    const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
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

export class VTTExporter {
  /**
   * Export captions to standard WebVTT string format
   */
  static export(captions: Caption[]): string {
    const sorted = [...captions].sort((a, b) => a.start - b.start);
    let output = 'WEBVTT - Exported with CaptionFlow AI\n\n';

    sorted.forEach((cap, idx) => {
      const startStr = this.secondsToVTTTime(cap.start);
      const endStr = this.secondsToVTTTime(cap.end);
      output += `${idx + 1}\n${startStr} --> ${endStr}\n${cap.text}\n\n`;
    });

    return output.trim() + '\n';
  }

  static secondsToVTTTime(totalSeconds: number): string {
    const sec = Math.max(0, totalSeconds);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);

    const pad2 = (n: number) => n.toString().padStart(2, '0');
    const pad3 = (n: number) => n.toString().padStart(3, '0');

    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad3(ms)}`;
  }
}
