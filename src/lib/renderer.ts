import { Caption, CaptionStyle, SafeZonePreset, Word } from '../types';
import { getAnimationTransform, getSafeCharacters } from './animations';
import { getStylePreset } from './styles';
import { TimingEngine } from './timing';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  currentTime: number;
  activeCaption: Caption | null;
  safeZone: SafeZonePreset;
  safeMarginX: number;
  safeMarginY: number;
  showSafeZoneGuides?: boolean;
}

export class CaptionRenderer {
  /**
   * Render active caption overlay on a target canvas
   */
  static renderFrame(renderCtx: RenderContext): void {
    const { canvas, ctx, currentTime, activeCaption, safeZone, safeMarginX, safeMarginY, showSafeZoneGuides } = renderCtx;
    const width = canvas.width;
    const height = canvas.height;

    // Draw safe zone guides if requested
    if (showSafeZoneGuides && safeZone !== 'none') {
      this.drawSafeZone(ctx, width, height, safeZone, safeMarginX, safeMarginY);
    }

    if (!activeCaption) return;

    // Resolve combined style
    const basePreset = getStylePreset(activeCaption.style);
    const style: CaptionStyle = {
      ...basePreset,
      ...(activeCaption.customStyle || {}),
    };

    // Scale font size proportionally to video height (baseline 1080p)
    const scaleFactor = height / 1080;
    const fontSize = Math.max(16, style.fontSize * scaleFactor);

    // Calculate animation progress
    const animProgress = TimingEngine.getAnimationProgress(activeCaption, currentTime, 0.45);
    const anim = getAnimationTransform(activeCaption.animation, animProgress);

    // If completely faded out, skip
    if (anim.opacity <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = anim.opacity;

    // Calculate position coordinates
    let targetX = (style.posX / 100) * width;
    let targetY = (style.posY / 100) * height;

    // Preset positions adjustment
    switch (style.positionPreset) {
      case 'top-left':
        targetX = width * 0.15;
        targetY = height * 0.15;
        break;
      case 'top-center':
        targetX = width * 0.5;
        targetY = height * 0.15;
        break;
      case 'top-right':
        targetX = width * 0.85;
        targetY = height * 0.15;
        break;
      case 'center':
        targetX = width * 0.5;
        targetY = height * 0.5;
        break;
      case 'bottom-left':
        targetX = width * 0.15;
        targetY = height * 0.82;
        break;
      case 'bottom-center':
        targetX = width * 0.5;
        targetY = height * 0.82;
        break;
      case 'bottom-right':
        targetX = width * 0.85;
        targetY = height * 0.82;
        break;
    }

    // Set font for measurement
    const weight = style.fontWeight || 'bold';
    ctx.font = `${weight} ${fontSize}px ${style.fontFamily}`;
    ctx.textAlign = style.textAlign || 'center';
    ctx.textBaseline = 'middle';

    // Split caption into lines
    const rawLines = activeCaption.text.split('\n');
    const lineHeight = fontSize * 1.25;
    const totalBlockHeight = rawLines.length * lineHeight;

    // Background block if requested
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      let maxLineWidth = 0;
      for (const line of rawLines) {
        const textWidth = ctx.measureText(line).width;
        if (textWidth > maxLineWidth) maxLineWidth = textWidth;
      }

      const padX = style.paddingX * scaleFactor;
      const padY = style.paddingY * scaleFactor;
      const bgW = maxLineWidth + padX * 2;
      const bgH = totalBlockHeight + padY * 2;

      let bgX = targetX - bgW / 2;
      if (style.textAlign === 'left') bgX = targetX - padX;
      if (style.textAlign === 'right') bgX = targetX - maxLineWidth - padX;
      const bgY = targetY - bgH / 2;

      ctx.fillStyle = style.backgroundColor;
      this.drawRoundedRect(ctx, bgX, bgY, bgW, bgH, style.borderRadius * scaleFactor);
      ctx.fill();
    }

    // Active word index for karaoke / highlight
    const activeWordIndex = TimingEngine.getActiveWordIndex(activeCaption.words, currentTime);

    // Apply animation transform matrix if pop/scale/rotate
    ctx.translate(targetX, targetY);
    if (anim.transform && anim.transform !== 'none') {
      if (anim.transform.includes('scale')) {
        const match = anim.transform.match(/scale\(([^)]+)\)/);
        if (match) {
          const s = parseFloat(match[1]);
          ctx.scale(s, s);
        }
      }
      if (anim.transform.includes('rotate')) {
        const match = anim.transform.match(/rotate\(([^)]+)deg\)/);
        if (match) {
          const deg = parseFloat(match[1]);
          ctx.rotate((deg * Math.PI) / 180);
        }
      }
      if (anim.transform.includes('translateY')) {
        const match = anim.transform.match(/translateY\(([^)]+)px\)/);
        if (match) {
          const ty = parseFloat(match[1]);
          ctx.translate(0, ty * scaleFactor);
        }
      }
    }
    ctx.translate(-targetX, -targetY);

    // Render words and lines
    let lineStartY = targetY - totalBlockHeight / 2 + lineHeight / 2;
    let currentGlobalWordIdx = 0;

    for (let l = 0; l < rawLines.length; l++) {
      const line = rawLines[l];
      const lineWords = line.split(/\s+/).filter(Boolean);
      const lineY = lineStartY + l * lineHeight;

      // Typewriter animation: reveal characters based on duration
      if (activeCaption.animation === 'typewriter') {
        const chars = getSafeCharacters(line);
        const duration = Math.max(0.2, activeCaption.end - activeCaption.start);
        const charProgress = Math.min(1, Math.max(0, (currentTime - activeCaption.start) / (duration * 0.8)));
        const visibleCharCount = Math.floor(charProgress * chars.length);
        const visibleText = chars.slice(0, visibleCharCount).join('');

        this.renderTextLine(ctx, visibleText, targetX, lineY, style, scaleFactor);
        continue;
      }

      // Check if word-level highlighting is active (Karaoke style or highlightMode)
      const hasWordHighlighting =
        activeCaption.style === 'karaoke' ||
        activeCaption.animation === 'karaoke' ||
        style.highlightMode === 'color' ||
        style.highlightMode === 'scale' ||
        style.highlightMode === 'glow' ||
        style.highlightMode === 'background';

      if (hasWordHighlighting && activeCaption.words.length > 0) {
        // Measure line total width for alignment positioning
        const wordMetrics = lineWords.map((w) => ({
          word: w,
          width: ctx.measureText(w).width,
          spaceWidth: ctx.measureText(' ').width,
        }));

        const totalLineWidth = wordMetrics.reduce((acc, m) => acc + m.width + m.spaceWidth, 0) - wordMetrics[wordMetrics.length - 1].spaceWidth;

        let startWordX = targetX;
        if (style.textAlign === 'center') {
          startWordX = targetX - totalLineWidth / 2;
        } else if (style.textAlign === 'right') {
          startWordX = targetX - totalLineWidth;
        }

        let currX = startWordX;

        for (let w = 0; w < lineWords.length; w++) {
          const wordText = lineWords[w];
          const isWordActive = currentGlobalWordIdx === activeWordIndex;
          const isWordPassed = currentGlobalWordIdx < activeWordIndex;

          const metric = wordMetrics[w];
          const wordCenter = currX + metric.width / 2;

          ctx.save();
          if (isWordActive && style.highlightScale > 1) {
            ctx.translate(wordCenter, lineY);
            ctx.scale(style.highlightScale, style.highlightScale);
            ctx.translate(-wordCenter, -lineY);
          }

          // Render single word with karaoke styling
          this.renderSingleWord(
            ctx,
            wordText,
            wordCenter,
            lineY,
            style,
            isWordActive,
            isWordPassed,
            scaleFactor
          );
          ctx.restore();

          currX += metric.width + metric.spaceWidth;
          currentGlobalWordIdx++;
        }
      } else {
        // Standard full line render
        this.renderTextLine(ctx, line, targetX, lineY, style, scaleFactor);
      }
    }

    ctx.restore();
  }

  private static renderSingleWord(
    ctx: CanvasRenderingContext2D,
    wordText: string,
    x: number,
    y: number,
    style: CaptionStyle,
    isActive: boolean,
    isPassed: boolean,
    scaleFactor: number
  ): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let textColor = isActive ? style.highlightColor : isPassed ? style.textColor : style.highlightNormalColor || style.textColor;

    if (isActive && style.highlightBackground && style.highlightBackground !== 'transparent') {
      const textWidth = ctx.measureText(wordText).width;
      const pad = 6 * scaleFactor;
      ctx.fillStyle = style.highlightBackground;
      this.drawRoundedRect(ctx, x - textWidth / 2 - pad, y - (style.fontSize * scaleFactor) / 2 - pad / 2, textWidth + pad * 2, style.fontSize * scaleFactor + pad, 6 * scaleFactor);
      ctx.fill();
    }

    // Shadow
    if (style.shadowColor && style.shadowBlur > 0) {
      ctx.shadowColor = isActive && style.highlightGlow ? style.highlightColor : style.shadowColor;
      ctx.shadowBlur = (isActive && style.highlightGlow ? 18 : style.shadowBlur) * scaleFactor;
      ctx.shadowOffsetX = style.shadowOffsetX * scaleFactor;
      ctx.shadowOffsetY = style.shadowOffsetY * scaleFactor;
    } else {
      ctx.shadowColor = 'transparent';
    }

    // Stroke
    if (style.strokeWidth > 0 && style.strokeColor !== 'transparent') {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * scaleFactor;
      ctx.strokeText(wordText, x, y);
    }

    // Fill
    ctx.fillStyle = textColor;
    ctx.fillText(wordText, x, y);

    // Underline
    if (isActive && style.highlightUnderline) {
      const textWidth = ctx.measureText(wordText).width;
      ctx.strokeStyle = style.highlightColor;
      ctx.lineWidth = 3 * scaleFactor;
      ctx.beginPath();
      ctx.moveTo(x - textWidth / 2, y + (style.fontSize * scaleFactor) / 2 + 2);
      ctx.lineTo(x + textWidth / 2, y + (style.fontSize * scaleFactor) / 2 + 2);
      ctx.stroke();
    }
  }

  private static renderTextLine(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    style: CaptionStyle,
    scaleFactor: number
  ): void {
    // Shadow
    if (style.shadowColor && style.shadowBlur > 0) {
      ctx.shadowColor = style.shadowColor;
      ctx.shadowBlur = style.shadowBlur * scaleFactor;
      ctx.shadowOffsetX = style.shadowOffsetX * scaleFactor;
      ctx.shadowOffsetY = style.shadowOffsetY * scaleFactor;
    } else {
      ctx.shadowColor = 'transparent';
    }

    // Stroke
    if (style.strokeWidth > 0 && style.strokeColor !== 'transparent') {
      ctx.strokeStyle = style.strokeColor;
      ctx.lineWidth = style.strokeWidth * scaleFactor;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(text, x, y);
    }

    // Fill
    ctx.fillStyle = style.textColor;
    ctx.fillText(text, x, y);
  }

  private static drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private static drawSafeZone(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    preset: SafeZonePreset,
    marginX: number,
    marginY: number
  ): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 184, 46, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    const padX = (marginX / 100) * width;
    const padY = (marginY / 100) * height;

    ctx.strokeRect(padX, padY, width - padX * 2, height - padY * 2);

    ctx.fillStyle = 'rgba(245, 184, 46, 0.7)';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(`Safe Zone (${preset})`, padX + 8, padY + 16);
    ctx.restore();
  }
}
