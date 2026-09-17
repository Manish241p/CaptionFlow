import { BrandKit, Caption, ProjectData, SafeZonePreset, StylePresetId, AnimationType } from '../types';
import { DEFAULT_BRAND_KIT } from './brand';

export class HistoryManager<T> {
  private past: T[] = [];
  private future: T[] = [];
  private maxHistory: number;

  constructor(maxHistory = 30) {
    this.maxHistory = maxHistory;
  }

  push(state: T): void {
    // Deep clone to ensure immutability
    const snapshot = JSON.parse(JSON.stringify(state));
    this.past.push(snapshot);
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    this.future = []; // Clear redo on new action
  }

  undo(currentState: T): T | null {
    if (this.past.length === 0) return null;
    const previous = this.past.pop()!;
    this.future.push(JSON.parse(JSON.stringify(currentState)));
    return previous;
  }

  redo(currentState: T): T | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(JSON.parse(JSON.stringify(currentState)));
    return next;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

export class ProjectStorage {
  private static PROJECT_SETTINGS_KEY = 'captionflow_settings';
  private static RECENT_PROJECT_KEY = 'captionflow_recent_project';

  static saveRecentProject(data: ProjectData): void {
    try {
      localStorage.setItem(this.RECENT_PROJECT_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save recent project to localStorage', e);
    }
  }

  static loadRecentProject(): ProjectData | null {
    try {
      const item = localStorage.getItem(this.RECENT_PROJECT_KEY);
      if (item) {
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn('Could not load recent project', e);
    }
    return null;
  }

  static exportProjectJSON(project: ProjectData): void {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '-')}-captionflow-project.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  static parseProjectJSON(jsonString: string): ProjectData {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.captions)) {
      throw new Error('Invalid CaptionFlow project file format');
    }
    return {
      version: parsed.version || '1.0.0',
      name: parsed.name || 'Untitled CaptionFlow Project',
      updatedAt: new Date().toISOString(),
      videoMetadata: parsed.videoMetadata || null,
      captions: parsed.captions || [],
      brandKit: parsed.brandKit || DEFAULT_BRAND_KIT,
      settings: {
        safeZone: parsed.settings?.safeZone || 'none',
        safeMarginX: parsed.settings?.safeMarginX ?? 10,
        safeMarginY: parsed.settings?.safeMarginY ?? 10,
        defaultStyle: parsed.settings?.defaultStyle || 'viral',
        defaultAnimation: parsed.settings?.defaultAnimation || 'pop',
        animationDuration: parsed.settings?.animationDuration || 0.4,
        readingSpeedThreshold: parsed.settings?.readingSpeedThreshold || 20,
      },
    };
  }

  static createProjectData(params: {
    name?: string;
    captions: Caption[];
    brandKit: BrandKit;
    safeZone: SafeZonePreset;
    safeMarginX: number;
    safeMarginY: number;
  }): ProjectData {
    return {
      version: '1.0.0',
      name: params.name || 'CaptionFlow_Project',
      updatedAt: new Date().toISOString(),
      videoMetadata: null,
      captions: params.captions,
      brandKit: params.brandKit,
      settings: {
        safeZone: params.safeZone,
        safeMarginX: params.safeMarginX,
        safeMarginY: params.safeMarginY,
        defaultStyle: 'viral',
        defaultAnimation: 'pop',
        animationDuration: 0.4,
        readingSpeedThreshold: 18,
      },
    };
  }

  static downloadProjectJSON(project: ProjectData, filename?: string): void {
    const jsonStr = JSON.stringify(project, null, 2);
    const fname = filename || `${project.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    this.downloadFile(jsonStr, fname, 'application/json');
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(this.PROJECT_SETTINGS_KEY);
      localStorage.removeItem(this.RECENT_PROJECT_KEY);
      localStorage.removeItem('captionflow_brand_kit');
      localStorage.removeItem('captionflow_brand_presets');
    } catch (e) {
      console.warn('Could not clear local storage', e);
    }
  }

  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
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
