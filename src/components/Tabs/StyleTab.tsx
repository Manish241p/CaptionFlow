import React, { useState } from 'react';
import { Caption, CaptionPositionPreset, CaptionStyle, HighlightMode, StylePresetId } from '../../types';
import { STYLE_PRESETS, SYSTEM_FONTS, getStylePreset } from '../../lib/styles';
import { BrandManager } from '../../lib/brand';
import {
  Palette,
  Type,
  Move,
  Sparkles,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Pipette,
} from 'lucide-react';

interface StyleTabProps {
  selectedCaption: Caption | null;
  onApplyStylePreset: (presetId: StylePresetId, applyToAll: boolean) => void;
  onUpdateStyleProperty: <K extends keyof CaptionStyle>(key: K, value: CaptionStyle[K], applyToAll: boolean) => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const StyleTab: React.FC<StyleTabProps> = ({
  selectedCaption,
  onApplyStylePreset,
  onUpdateStyleProperty,
  onToast,
}) => {
  const [applyToAll, setApplyToAll] = useState(true);
  const [customFontInput, setCustomFontInput] = useState('');

  // Active style resolution
  const currentPresetId = (selectedCaption?.style as StylePresetId) || 'viral';
  const resolvedStyle: CaptionStyle = {
    ...getStylePreset(currentPresetId),
    ...(selectedCaption?.customStyle || {}),
  };

  // Color picker using EyeDropper if available
  const pickWithEyedropper = async (property: 'textColor' | 'strokeColor' | 'shadowColor' | 'backgroundColor' | 'highlightColor') => {
    if (BrandManager.isEyeDropperSupported()) {
      const hex = await BrandManager.openEyeDropper();
      if (hex) {
        onUpdateStyleProperty(property, hex, applyToAll);
        onToast('success', `Picked color: ${hex}`);
      }
    }
  };

  const positionPresets: { id: CaptionPositionPreset; label: string }[] = [
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-center', label: 'Top Center' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'center', label: 'Center' },
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-center', label: 'Bottom Center' },
    { id: 'bottom-right', label: 'Bottom Right' },
  ];

  return (
    <div className="p-4 flex flex-col gap-5 text-xs text-[#CBD5E1] overflow-y-auto select-none">
      {/* Scope toggle: Selected vs All */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-[#161B22] border border-[#252B33]">
        <span className="text-[11px] font-semibold text-white">Apply Style Changes to:</span>
        <div className="flex items-center rounded-md bg-[#1F2630] p-0.5 border border-[#252B33]">
          <button
            onClick={() => setApplyToAll(false)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              !applyToAll ? 'bg-[#F5B82E] text-[#0B0D10] font-bold' : 'text-[#8D96A3] hover:text-white'
            }`}
          >
            Selected Only
          </button>
          <button
            onClick={() => setApplyToAll(true)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              applyToAll ? 'bg-[#F5B82E] text-[#0B0D10] font-bold' : 'text-[#8D96A3] hover:text-white'
            }`}
          >
            All Captions
          </button>
        </div>
      </div>

      {/* 1. Ten Professional Style Presets */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F5B82E]" />
            <span>10 Professional Style Presets</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {STYLE_PRESETS.map((preset) => {
            const isCurrent = currentPresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  onApplyStylePreset(preset.id, applyToAll);
                  onToast('success', `Applied style preset: ${preset.name}`);
                }}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${
                  isCurrent
                    ? 'bg-[#1E2631] border-[#F5B82E] shadow-md shadow-[#F5B82E]/15 ring-1 ring-[#F5B82E]'
                    : 'bg-[#161B22] border-[#252B33] hover:border-[#384352] hover:bg-[#1A212B]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-white text-xs group-hover:text-[#F5B82E] transition-colors">
                    {preset.name}
                  </span>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-[#F5B82E]" />}
                </div>

                <div
                  style={{
                    backgroundColor: preset.style.backgroundColor !== 'transparent' ? preset.style.backgroundColor : '#0D1117',
                    color: preset.style.textColor,
                    fontFamily: preset.style.fontFamily,
                  }}
                  className="w-full py-2 px-1 text-center rounded border border-[#252B33] text-[11px] font-bold truncate mb-1.5 shadow-inner"
                >
                  {preset.previewSample}
                </div>

                <p className="text-[10px] text-[#8D96A3] line-clamp-1">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 2. Typography Customizer */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Typography & Fonts</span>
        </span>

        {/* Font Family selector */}
        <div>
          <label className="text-[11px] text-[#8D96A3] block mb-1">Local / System Font</label>
          <select
            value={resolvedStyle.fontFamily}
            onChange={(e) => onUpdateStyleProperty('fontFamily', e.target.value, applyToAll)}
            className="w-full bg-[#161B22] border border-[#252B33] rounded-lg p-2 text-white text-xs outline-none"
          >
            {SYSTEM_FONTS.map((f) => (
              <option key={f.name} value={f.value}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Custom font family name input */}
        <div>
          <label className="text-[11px] text-[#8D96A3] block mb-1">Or Enter Custom Local Font Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customFontInput}
              onChange={(e) => setCustomFontInput(e.target.value)}
              placeholder="e.g. Montserrat, Roboto, Arial..."
              className="flex-1 bg-[#161B22] border border-[#252B33] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#64748B] outline-none"
            />
            <button
              onClick={() => {
                if (customFontInput.trim()) {
                  onUpdateStyleProperty('fontFamily', customFontInput.trim(), applyToAll);
                  onToast('success', `Font set to: ${customFontInput}`);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#1F2630] hover:bg-[#283240] text-xs font-semibold text-white border border-[#252B33]"
            >
              Set
            </button>
          </div>
        </div>

        {/* Font Size & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[11px] text-[#8D96A3]">Font Size</label>
              <span className="font-mono text-[#F5B82E]">{resolvedStyle.fontSize}px</span>
            </div>
            <input
              type="range"
              min={24}
              max={96}
              value={resolvedStyle.fontSize}
              onChange={(e) => onUpdateStyleProperty('fontSize', parseInt(e.target.value, 10), applyToAll)}
              className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Font Weight</label>
            <select
              value={resolvedStyle.fontWeight}
              onChange={(e) => onUpdateStyleProperty('fontWeight', e.target.value, applyToAll)}
              className="w-full bg-[#161B22] border border-[#252B33] rounded-lg p-1.5 text-white text-xs outline-none"
            >
              <option value="400">Regular (400)</option>
              <option value="600">SemiBold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">ExtraBold (800)</option>
              <option value="900">Black / Ultra (900)</option>
            </select>
          </div>
        </div>

        {/* Text Alignment & Transform */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Text Alignment</label>
            <div className="flex rounded-lg bg-[#161B22] border border-[#252B33] p-0.5">
              <button
                onClick={() => onUpdateStyleProperty('textAlign', 'left', applyToAll)}
                className={`flex-1 py-1 flex items-center justify-center rounded ${
                  resolvedStyle.textAlign === 'left' ? 'bg-[#F5B82E] text-black font-bold' : 'text-[#8D96A3]'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateStyleProperty('textAlign', 'center', applyToAll)}
                className={`flex-1 py-1 flex items-center justify-center rounded ${
                  resolvedStyle.textAlign === 'center' ? 'bg-[#F5B82E] text-black font-bold' : 'text-[#8D96A3]'
                }`}
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onUpdateStyleProperty('textAlign', 'right', applyToAll)}
                className={`flex-1 py-1 flex items-center justify-center rounded ${
                  resolvedStyle.textAlign === 'right' ? 'bg-[#F5B82E] text-black font-bold' : 'text-[#8D96A3]'
                }`}
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Transform</label>
            <select
              value={resolvedStyle.textTransform}
              onChange={(e) => onUpdateStyleProperty('textTransform', e.target.value as any, applyToAll)}
              className="w-full bg-[#161B22] border border-[#252B33] rounded-lg p-1.5 text-white text-xs outline-none"
            >
              <option value="none">Normal Case</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize Words</option>
            </select>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 3. Colors, Stroke & Shadow */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Colors & Stroke</span>
        </span>

        <div className="grid grid-cols-2 gap-3">
          {/* Text Color */}
          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Text Color</label>
            <div className="flex items-center gap-2 bg-[#161B22] p-1.5 rounded-lg border border-[#252B33]">
              <input
                type="color"
                value={resolvedStyle.textColor.startsWith('#') ? resolvedStyle.textColor : '#FFFFFF'}
                onChange={(e) => onUpdateStyleProperty('textColor', e.target.value, applyToAll)}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[11px] text-white flex-1">{resolvedStyle.textColor}</span>
              {BrandManager.isEyeDropperSupported() && (
                <button
                  onClick={() => pickWithEyedropper('textColor')}
                  className="p-1 text-[#8D96A3] hover:text-white"
                  title="Pick color with Eyedropper"
                >
                  <Pipette className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Stroke Color */}
          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Stroke (Outline)</label>
            <div className="flex items-center gap-2 bg-[#161B22] p-1.5 rounded-lg border border-[#252B33]">
              <input
                type="color"
                value={resolvedStyle.strokeColor.startsWith('#') ? resolvedStyle.strokeColor : '#000000'}
                onChange={(e) => onUpdateStyleProperty('strokeColor', e.target.value, applyToAll)}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[11px] text-white flex-1">{resolvedStyle.strokeWidth}px</span>
            </div>
          </div>
        </div>

        {/* Stroke Width Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[11px] text-[#8D96A3]">Stroke Thickness</label>
            <span className="font-mono text-[#F5B82E]">{resolvedStyle.strokeWidth}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={12}
            value={resolvedStyle.strokeWidth}
            onChange={(e) => onUpdateStyleProperty('strokeWidth', parseInt(e.target.value, 10), applyToAll)}
            className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
          />
        </div>

        {/* Background Box Color & Radius */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Background Pill Color</label>
            <div className="flex items-center gap-2 bg-[#161B22] p-1.5 rounded-lg border border-[#252B33]">
              <input
                type="color"
                value={
                  resolvedStyle.backgroundColor.startsWith('#')
                    ? resolvedStyle.backgroundColor
                    : '#0B0D10'
                }
                onChange={(e) => onUpdateStyleProperty('backgroundColor', e.target.value, applyToAll)}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <button
                onClick={() => onUpdateStyleProperty('backgroundColor', 'transparent', applyToAll)}
                className="text-[10px] text-[#8D96A3] hover:text-white px-1.5 py-0.5 rounded bg-[#202832]"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Corner Radius</label>
            <input
              type="range"
              min={0}
              max={32}
              value={resolvedStyle.borderRadius}
              onChange={(e) => onUpdateStyleProperty('borderRadius', parseInt(e.target.value, 10), applyToAll)}
              className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E] mt-3"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 4. Word Highlight & Karaoke Engine */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#F5B82E]" />
          <span>Karaoke & Word Highlight Engine</span>
        </span>

        <div className="grid grid-cols-2 gap-3">
          {/* Highlight Color */}
          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Active Word Color</label>
            <div className="flex items-center gap-2 bg-[#161B22] p-1.5 rounded-lg border border-[#252B33]">
              <input
                type="color"
                value={resolvedStyle.highlightColor.startsWith('#') ? resolvedStyle.highlightColor : '#F5B82E'}
                onChange={(e) => onUpdateStyleProperty('highlightColor', e.target.value, applyToAll)}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[11px] text-white flex-1">{resolvedStyle.highlightColor}</span>
            </div>
          </div>

          {/* Highlight Mode */}
          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Highlight Mode</label>
            <select
              value={resolvedStyle.highlightMode}
              onChange={(e) => onUpdateStyleProperty('highlightMode', e.target.value as HighlightMode, applyToAll)}
              className="w-full bg-[#161B22] border border-[#252B33] rounded-lg p-2 text-white text-xs outline-none"
            >
              <option value="color">Color Only</option>
              <option value="scale">Scale Punch (1.15x)</option>
              <option value="background">Background Pill</option>
              <option value="underline">Underline</option>
              <option value="glow">Neon Glow</option>
            </select>
          </div>
        </div>

        {/* Active Scale Slider */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[11px] text-[#8D96A3]">Active Word Scale Factor</label>
            <span className="font-mono text-[#F5B82E]">{resolvedStyle.highlightScale}x</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={1.4}
            step={0.02}
            value={resolvedStyle.highlightScale}
            onChange={(e) => onUpdateStyleProperty('highlightScale', parseFloat(e.target.value), applyToAll)}
            className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 5. Caption Positioning & Alignment */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-[#A855F7]" />
          <span>Screen Positioning</span>
        </span>

        {/* Preset Position grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {positionPresets.map((p) => {
            const isCurrentPos = resolvedStyle.positionPreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onUpdateStyleProperty('positionPreset', p.id, applyToAll)}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-medium transition-colors ${
                  isCurrentPos
                    ? 'bg-[#F5B82E] text-[#0B0D10] font-bold border-[#F5B82E]'
                    : 'bg-[#161B22] border-[#252B33] text-[#CBD5E1] hover:bg-[#1F2630]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom X and Y Percentage */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[11px] text-[#8D96A3]">Position X (%)</label>
              <span className="font-mono text-[#F5B82E]">{resolvedStyle.posX}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={95}
              value={resolvedStyle.posX}
              onChange={(e) => onUpdateStyleProperty('posX', parseInt(e.target.value, 10), applyToAll)}
              className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="text-[11px] text-[#8D96A3]">Position Y (%)</label>
              <span className="font-mono text-[#F5B82E]">{resolvedStyle.posY}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={95}
              value={resolvedStyle.posY}
              onChange={(e) => onUpdateStyleProperty('posY', parseInt(e.target.value, 10), applyToAll)}
              className="w-full h-1 bg-[#252B33] rounded appearance-none cursor-pointer accent-[#F5B82E]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
