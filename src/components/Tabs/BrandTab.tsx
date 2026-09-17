import React, { useRef, useState } from 'react';
import { BrandKit } from '../../types';
import { BrandManager } from '../../lib/brand';
import { SYSTEM_FONTS } from '../../lib/styles';
import {
  Sparkles,
  Upload,
  Save,
  Check,
  Pipette,
  Palette,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';

interface BrandTabProps {
  brandKit: BrandKit;
  onUpdateBrandKit: (updated: BrandKit) => void;
  onApplyBrandKitToCaptions: () => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', text: string) => void;
}

export const BrandTab: React.FC<BrandTabProps> = ({
  brandKit,
  onUpdateBrandKit,
  onApplyBrandKitToCaptions,
  onToast,
}) => {
  const brochureInputRef = useRef<HTMLInputElement>(null);
  const brochureCanvasRef = useRef<HTMLCanvasElement>(null);
  const brochureImgRef = useRef<HTMLImageElement | null>(null);

  const [brochureUrl, setBrochureUrl] = useState<string | null>(null);
  const [extractedPalette, setExtractedPalette] = useState<string[]>([]);
  const [activeTargetColorField, setActiveTargetColorField] = useState<
    'primaryColor' | 'accentColor' | 'textColor'
  >('primaryColor');

  // Handle brochure image selection (local only)
  const handleBrochureFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (brochureUrl) {
      URL.revokeObjectURL(brochureUrl);
    }

    const url = URL.createObjectURL(file);
    setBrochureUrl(url);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      brochureImgRef.current = img;
      const palette = BrandManager.extractPalette(img, 8);
      setExtractedPalette(palette);
      drawBrochureCanvas(img);
      onToast('success', 'Brochure loaded! Click anywhere on the image to sample colors.');
    };
    img.src = url;
    e.target.value = '';
  };

  const drawBrochureCanvas = (img: HTMLImageElement) => {
    const canvas = brochureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale to fit canvas box smoothly
    const maxW = 320;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  // Click on brochure canvas to sample pixel color
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = brochureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = BrandManager.rgbToHex(pixel[0], pixel[1], pixel[2]);

    onUpdateBrandKit({
      ...brandKit,
      [activeTargetColorField]: hex,
    });

    onToast('success', `Sampled ${hex} from brochure for ${activeTargetColorField}`);
  };

  // Eyedropper sampling
  const pickWithEyedropper = async (field: 'primaryColor' | 'accentColor' | 'textColor') => {
    if (BrandManager.isEyeDropperSupported()) {
      const hex = await BrandManager.openEyeDropper();
      if (hex) {
        onUpdateBrandKit({
          ...brandKit,
          [field]: hex,
        });
        onToast('success', `Sampled ${hex} for ${field}`);
      }
    }
  };

  // Save brand kit to localStorage
  const handleSaveBrand = () => {
    BrandManager.saveBrand(brandKit);
    onToast('success', 'Brand kit saved to localStorage!');
  };

  return (
    <div className="p-4 flex flex-col gap-5 text-xs text-[#CBD5E1] overflow-y-auto select-none">
      {/* 1. Brand Kit Card */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-[#F5B82E]" />
            <span>Brand Kit</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSaveBrand}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181E25] hover:bg-[#252B33] text-[#CBD5E1] hover:text-white border border-[#252B33] text-[11px]"
              title="Save brand kit to browser storage"
            >
              <Save className="w-3 h-3 text-[#10B981]" />
              <span>Save Brand</span>
            </button>
            <button
              onClick={onApplyBrandKitToCaptions}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#F5B82E] hover:bg-[#E5A81E] text-[#0B0D10] font-bold text-[11px]"
              title="Apply brand kit styling to all captions"
            >
              <Check className="w-3 h-3" />
              <span>Apply Brand</span>
            </button>
          </div>
        </div>

        {/* Colors Inputs */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Primary Color */}
          <div className="p-2 rounded-lg bg-[#161B22] border border-[#252B33] flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-[#8D96A3]">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandKit.primaryColor}
                onChange={(e) => onUpdateBrandKit({ ...brandKit, primaryColor: e.target.value })}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[10px] text-white truncate">{brandKit.primaryColor}</span>
            </div>
            {BrandManager.isEyeDropperSupported() && (
              <button
                onClick={() => pickWithEyedropper('primaryColor')}
                className="text-[10px] text-[#8D96A3] hover:text-white flex items-center gap-1 mt-0.5"
              >
                <Pipette className="w-3 h-3" />
                <span>Eyedropper</span>
              </button>
            )}
          </div>

          {/* Accent Color */}
          <div className="p-2 rounded-lg bg-[#161B22] border border-[#252B33] flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-[#8D96A3]">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandKit.accentColor}
                onChange={(e) => onUpdateBrandKit({ ...brandKit, accentColor: e.target.value })}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[10px] text-white truncate">{brandKit.accentColor}</span>
            </div>
            {BrandManager.isEyeDropperSupported() && (
              <button
                onClick={() => pickWithEyedropper('accentColor')}
                className="text-[10px] text-[#8D96A3] hover:text-white flex items-center gap-1 mt-0.5"
              >
                <Pipette className="w-3 h-3" />
                <span>Eyedropper</span>
              </button>
            )}
          </div>

          {/* Text Color */}
          <div className="p-2 rounded-lg bg-[#161B22] border border-[#252B33] flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-[#8D96A3]">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brandKit.textColor}
                onChange={(e) => onUpdateBrandKit({ ...brandKit, textColor: e.target.value })}
                className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[10px] text-white truncate">{brandKit.textColor}</span>
            </div>
            {BrandManager.isEyeDropperSupported() && (
              <button
                onClick={() => pickWithEyedropper('textColor')}
                className="text-[10px] text-[#8D96A3] hover:text-white flex items-center gap-1 mt-0.5"
              >
                <Pipette className="w-3 h-3" />
                <span>Eyedropper</span>
              </button>
            )}
          </div>
        </div>

        {/* Brand Font & Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Brand Font Family</label>
            <select
              value={brandKit.fontFamily}
              onChange={(e) => onUpdateBrandKit({ ...brandKit, fontFamily: e.target.value })}
              className="w-full bg-[#161B22] border border-[#252B33] rounded-lg p-2 text-white text-xs outline-none"
            >
              {SYSTEM_FONTS.map((f) => (
                <option key={f.name} value={f.value}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[#8D96A3] block mb-1">Font Weight</label>
            <select
              value={brandKit.fontWeight}
              onChange={(e) => onUpdateBrandKit({ ...brandKit, fontWeight: e.target.value })}
              className="w-full bg-[#161B22] border border-[#252B33] rounded-lg p-2 text-white text-xs outline-none"
            >
              <option value="600">SemiBold (600)</option>
              <option value="700">Bold (700)</option>
              <option value="800">ExtraBold (800)</option>
              <option value="900">Black / Ultra (900)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#252B33]" />

      {/* 2. Brochure Brand Mode */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8D96A3] flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Brochure Brand Mode (Offline Color Picker)</span>
          </span>
        </div>
        <p className="text-[11px] text-[#8D96A3] -mt-1 leading-relaxed">
          Import a flyer, brochure, logo, or brand guide (PNG/JPG/WebP) to visually extract and sample colors locally.
        </p>

        {/* Import Brochure Button */}
        <button
          onClick={() => brochureInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-[#161B22] hover:bg-[#1E2631] border border-dashed border-[#252B33] hover:border-[#3B82F6] text-xs font-semibold text-white transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4 text-[#3B82F6]" />
          <span>Import Brochure Image (PNG / JPG / WebP)</span>
        </button>
        <input
          type="file"
          ref={brochureInputRef}
          onChange={handleBrochureFile}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
        />

        {/* Brochure Interactive Canvas */}
        {brochureUrl && (
          <div className="p-3 rounded-xl bg-[#161B22] border border-[#252B33] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white">Click image to sample color for:</span>
              <div className="flex gap-1">
                {(['primaryColor', 'accentColor', 'textColor'] as const).map((field) => (
                  <button
                    key={field}
                    onClick={() => setActiveTargetColorField(field)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      activeTargetColorField === field
                        ? 'bg-[#F5B82E] text-black'
                        : 'bg-[#1F2630] text-[#8D96A3]'
                    }`}
                  >
                    {field === 'primaryColor' ? 'Primary' : field === 'accentColor' ? 'Accent' : 'Text'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center bg-[#0D1117] p-2 rounded-lg border border-[#252B33] overflow-hidden">
              <canvas
                ref={brochureCanvasRef}
                onClick={handleCanvasClick}
                className="max-w-full max-h-60 rounded cursor-crosshair object-contain"
                title="Click any pixel to pick that color"
              />
            </div>

            {/* Extracted Swatches */}
            {extractedPalette.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#8D96A3] font-semibold">Extracted Brochure Palette:</span>
                <div className="flex flex-wrap gap-2">
                  {extractedPalette.map((hex, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onUpdateBrandKit({
                          ...brandKit,
                          [activeTargetColorField]: hex,
                        });
                        onToast('success', `Applied ${hex} to ${activeTargetColorField}`);
                      }}
                      style={{ backgroundColor: hex }}
                      className="w-7 h-7 rounded-md border border-[#252B33] shadow-sm hover:scale-110 transition-transform cursor-pointer"
                      title={`Assign ${hex} to ${activeTargetColorField}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
