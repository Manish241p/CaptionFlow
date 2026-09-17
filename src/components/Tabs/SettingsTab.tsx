import React from 'react';
import { SafeZonePreset } from '../../types';
import {
  ShieldAlert,
  Keyboard,
  Settings as SettingsIcon,
  Trash2,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
} from 'lucide-react';

interface SettingsTabProps {
  safeZone: SafeZonePreset;
  safeMarginX: number;
  safeMarginY: number;
  readingSpeedThreshold: number;
  onUpdateSafeZone: (preset: SafeZonePreset) => void;
  onUpdateSafeMarginX: (val: number) => void;
  onUpdateSafeMarginY: (val: number) => void;
  onUpdateReadingSpeedThreshold: (val: number) => void;
  onResetProject: () => void;
  onClearAllStorage: () => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  safeZone,
  safeMarginX,
  safeMarginY,
  readingSpeedThreshold,
  onUpdateSafeZone,
  onUpdateSafeMarginX,
  onUpdateSafeMarginY,
  onUpdateReadingSpeedThreshold,
  onResetProject,
  onClearAllStorage,
  onToast,
}) => {
  const safeZoneOptions: { id: SafeZonePreset; label: string; desc: string }[] = [
    { id: '9:16', label: '9:16 Reel / Shorts / TikTok', desc: 'Vertical video safe area' },
    { id: '16:9', label: '16:9 YouTube / Landscape', desc: 'Standard widescreen safe area' },
    { id: '1:1', label: '1:1 Square Feed', desc: 'Square post safe area' },
    { id: '4:5', label: '4:5 Social Feed', desc: 'Portrait post safe area' },
    { id: 'none', label: 'None (Disabled)', desc: 'No guide lines' },
  ];

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause video' },
    { key: 'Arrow Left', desc: 'Step -0.1s back' },
    { key: 'Arrow Right', desc: 'Step +0.1s forward' },
    { key: 'Ctrl / Cmd + Z', desc: 'Undo last change' },
    { key: 'Ctrl / Cmd + Shift + Z', desc: 'Redo change' },
    { key: 'Ctrl / Cmd + S', desc: 'Save project JSON' },
    { key: 'Delete', desc: 'Delete selected caption' },
  ];

  return (
    <div className="p-4 flex flex-col gap-5 text-xs text-[#CBD5E1] overflow-y-auto select-none">
      {/* 1. Safe Zone & Guide Lines */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#F5B82E]" />
          <span>Social Platform Safe Zones</span>
        </span>

        <div className="grid grid-cols-1 gap-2">
          {safeZoneOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onUpdateSafeZone(opt.id)}
              className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                safeZone === opt.id
                  ? 'bg-[#F5B82E]/10 border-[#F5B82E] text-white'
                  : 'bg-[#161B22] border-[#252B33] text-[#8D96A3] hover:text-white'
              }`}
            >
              <div>
                <p className="font-bold text-xs">{opt.label}</p>
                <p className="text-[10px] text-[#8D96A3]">{opt.desc}</p>
              </div>
              {safeZone === opt.id && (
                <span className="w-2 h-2 rounded-full bg-[#F5B82E]" />
              )}
            </button>
          ))}
        </div>

        {/* Margin Controls */}
        {safeZone !== 'none' && (
          <div className="grid grid-cols-2 gap-3 mt-1 p-3 rounded-lg bg-[#161B22] border border-[#252B33]">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] text-[#8D96A3]">Safe Margin X</label>
                <span className="font-mono text-[#F5B82E]">{safeMarginX}%</span>
              </div>
              <input
                type="range"
                min={2}
                max={25}
                value={safeMarginX}
                onChange={(e) => onUpdateSafeMarginX(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-[10px] text-[#8D96A3]">Safe Margin Y</label>
                <span className="font-mono text-[#F5B82E]">{safeMarginY}%</span>
              </div>
              <input
                type="range"
                min={2}
                max={25}
                value={safeMarginY}
                onChange={(e) => onUpdateSafeMarginY(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 2. Reading Speed Threshold */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Reading Speed Quality Alert</span>
        </span>

        <div className="p-3 rounded-lg bg-[#161B22] border border-[#252B33] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#CBD5E1]">Alert Threshold</span>
            <span className="font-mono text-[#F5B82E] font-bold">{readingSpeedThreshold} words / sec</span>
          </div>
          <input
            type="range"
            min={10}
            max={30}
            value={readingSpeedThreshold}
            onChange={(e) => onUpdateReadingSpeedThreshold(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
          />
          <p className="text-[10px] text-[#8D96A3] leading-relaxed">
            Captions with reading speed exceeding this limit will show a red badge in the editor. Standard social video optimal rate is 14–18 words/sec.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 3. Keyboard Shortcuts Reference */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Keyboard Shortcuts</span>
        </span>

        <div className="p-2 rounded-lg bg-[#161B22] border border-[#252B33] flex flex-col divide-y divide-[#252B33]">
          {shortcuts.map((sc, i) => (
            <div key={i} className="py-1.5 px-2 flex items-center justify-between text-[11px]">
              <span className="text-[#8D96A3]">{sc.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#1F2630] border border-[#252B33] font-mono text-white text-[10px]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 4. Project Reset & Storage */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <SettingsIcon className="w-3.5 h-3.5 text-[#EF4444]" />
          <span>Reset & Storage Management</span>
        </span>

        <div className="flex flex-col gap-2">
          <button
            onClick={onResetProject}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#161B22] hover:bg-[#202832] border border-[#252B33] text-xs font-semibold text-[#CBD5E1] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#F5B82E]" />
            <span>Reset Current Captions</span>
          </button>

          <button
            onClick={onClearAllStorage}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#2D1619] hover:bg-[#3D1D22] border border-[#EF4444]/30 text-xs font-semibold text-[#FCA5A5] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
            <span>Clear All Local Storage & Brand Kits</span>
          </button>
        </div>
      </div>
    </div>
  );
};
