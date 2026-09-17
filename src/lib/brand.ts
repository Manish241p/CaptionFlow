import { BrandKit } from '../types';

export const DEFAULT_BRAND_KIT: BrandKit = {
  name: 'Default Modern Brand',
  primaryColor: '#F5B82E',
  accentColor: '#3B82F6',
  textColor: '#FFFFFF',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontWeight: '800',
  backgroundColor: 'rgba(18, 22, 27, 0.85)',
  strokeColor: '#000000',
};

export class BrandManager {
  private static STORAGE_KEY = 'captionflow_brand_kit';
  private static PRESETS_KEY = 'captionflow_brand_presets';

  static loadBrand(): BrandKit {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_BRAND_KIT, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not load brand from localStorage', e);
    }
    return { ...DEFAULT_BRAND_KIT };
  }

  static saveBrand(brand: BrandKit): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(brand));
    } catch (e) {
      console.warn('Could not save brand to localStorage', e);
    }
  }

  static getDefaultBrandKit(): BrandKit {
    return { ...DEFAULT_BRAND_KIT };
  }

  static isEyeDropperSupported(): boolean {
    return typeof window !== 'undefined' && 'EyeDropper' in window;
  }

  static async openEyeDropper(): Promise<string | null> {
    if (!this.isEyeDropperSupported()) return null;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      return result?.sRGBHex || null;
    } catch {
      // User cancelled eyedropper
      return null;
    }
  }

  /**
   * Sample pixel color from an Image element at (x, y) coordinates
   */
  static sampleImageColor(img: HTMLImageElement, x: number, y: number): string {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';

    ctx.drawImage(img, 0, 0);
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    return this.rgbToHex(pixel[0], pixel[1], pixel[2]);
  }

  /**
   * Color conversions: HEX <-> RGB <-> HSL
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map((c) => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  static rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  }

  /**
   * Extract dominant color palette from brochure image
   */
  static extractPalette(img: HTMLImageElement, colorCount = 6): string[] {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return ['#F5B82E', '#3B82F6', '#FFFFFF', '#0B0D10'];

      const w = Math.min(120, img.naturalWidth || 100);
      const h = Math.min(120, img.naturalHeight || 100);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const data = ctx.getImageData(0, 0, w, h).data;
      const colorBins: Record<string, number> = {};

      for (let i = 0; i < data.length; i += 16) {
        // Skip transparent or near-black/near-white extremes for better palette vibrancy
        const a = data[i + 3];
        if (a < 128) continue;
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i + 1] / 32) * 32;
        const b = Math.round(data[i + 2] / 32) * 32;
        const hex = this.rgbToHex(r, g, b);
        colorBins[hex] = (colorBins[hex] || 0) + 1;
      }

      const sorted = Object.entries(colorBins)
        .sort((a, b) => b[1] - a[1])
        .map(([hex]) => hex);

      return sorted.slice(0, colorCount);
    } catch {
      return ['#F5B82E', '#3B82F6', '#10B981', '#EC4899', '#FFFFFF', '#12161B'];
    }
  }
}
